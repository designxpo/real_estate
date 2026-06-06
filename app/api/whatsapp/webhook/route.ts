// Meta WhatsApp webhook. GET = subscription handshake. POST = inbound messages
// and delivery-status receipts (signature-verified, idempotent by message id).
//
// Processing is bulk + atomic: the whole batch is flattened, deduped/looked-up in
// a handful of queries, then written in a single $transaction (no per-message
// round-trips, no partial-batch state on mid-loop failure).
import { NextResponse } from "next/server";
import type { Prisma, WaMessageStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { verifyChallenge, verifyWebhookSignature } from "@/lib/whatsapp";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const challenge = verifyChallenge(params);
  if (challenge) return new Response(challenge, { status: 200 });
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

type InboundMsg = { id: string; from: string; text?: { body: string } };
type StatusRcpt = { id: string; status: string };

const STATUS_MAP: Record<string, WaMessageStatus> = {
  delivered: "delivered",
  read: "read",
  sent: "sent",
  failed: "failed",
};

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-hub-signature-256");
  if (!verifyWebhookSignature(raw, sig)) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  // Flatten entry → changes → value, collecting every inbound message + status.
  const messages: InboundMsg[] = [];
  const statuses: StatusRcpt[] = [];
  const entries = (payload as { entry?: unknown[] }).entry ?? [];
  for (const entry of entries as Array<{ changes?: Array<{ value?: Record<string, unknown> }> }>) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      messages.push(...((value.messages as InboundMsg[]) ?? []));
      statuses.push(...((value.statuses as StatusRcpt[]) ?? []));
    }
  }

  if (messages.length === 0 && statuses.length === 0) {
    return NextResponse.json({ ok: true });
  }

  // --- Inbound messages: bulk dedupe + bulk contact lookup, then createMany ---
  const createData: Prisma.WaMessageCreateManyInput[] = [];
  if (messages.length > 0) {
    const firstFirm = await prisma.firm.findFirst({ select: { id: true } });
    if (firstFirm) {
      const ids = messages.map((m) => m.id);
      const phones = Array.from(new Set(messages.map((m) => `+${m.from}`)));
      const [existing, contacts] = await Promise.all([
        prisma.waMessage.findMany({ where: { metaMessageId: { in: ids } }, select: { metaMessageId: true } }),
        prisma.contact.findMany({ where: { phone: { in: phones } }, select: { id: true, firmId: true, phone: true } }),
      ]);
      const seen = new Set(existing.map((e) => e.metaMessageId));
      const byPhone = new Map(contacts.map((c) => [c.phone, c]));
      for (const m of messages) {
        if (seen.has(m.id)) continue; // already stored (or duplicated within this batch)
        seen.add(m.id);
        const c = byPhone.get(`+${m.from}`);
        createData.push({
          firmId: c?.firmId ?? firstFirm.id,
          contactId: c?.id,
          toPhone: m.from,
          fromPhone: m.from,
          direction: "inbound",
          status: "received",
          bodyText: m.text?.body,
          metaMessageId: m.id,
        });
      }
    }
  }

  // --- Delivery/read receipts: group ids by mapped status, one updateMany each ---
  const grouped = new Map<WaMessageStatus, string[]>();
  for (const s of statuses) {
    const next = STATUS_MAP[s.status];
    if (!next) continue;
    (grouped.get(next) ?? grouped.set(next, []).get(next)!).push(s.id);
  }

  // Atomic: the whole batch commits together, so we never half-process a webhook.
  const ops: Prisma.PrismaPromise<unknown>[] = [];
  if (createData.length > 0) {
    ops.push(prisma.waMessage.createMany({ data: createData, skipDuplicates: true }));
  }
  for (const [status, ids] of grouped) {
    ops.push(prisma.waMessage.updateMany({ where: { metaMessageId: { in: ids } }, data: { status } }));
  }
  if (ops.length > 0) await prisma.$transaction(ops);

  return NextResponse.json({ ok: true });
}
