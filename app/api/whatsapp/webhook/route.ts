// Meta WhatsApp webhook. GET = subscription handshake. POST = inbound messages
// and delivery-status receipts (signature-verified, idempotent by message id).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyChallenge, verifyWebhookSignature } from "@/lib/whatsapp";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const challenge = verifyChallenge(params);
  if (challenge) return new Response(challenge, { status: 200 });
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

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

  // Walk entry → changes → value for messages + statuses.
  const entries = (payload as { entry?: unknown[] }).entry ?? [];
  for (const entry of entries as Array<{ changes?: Array<{ value?: Record<string, unknown> }> }>) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      const firstFirm = await prisma.firm.findFirst({ select: { id: true } });
      if (!firstFirm) continue;

      // Inbound messages
      const messages = (value.messages as Array<{ id: string; from: string; text?: { body: string } }>) ?? [];
      for (const m of messages) {
        const exists = await prisma.waMessage.findUnique({ where: { metaMessageId: m.id } });
        if (exists) continue;
        const contact = await prisma.contact.findFirst({ where: { phone: `+${m.from}` } });
        await prisma.waMessage.create({
          data: {
            firmId: contact?.firmId ?? firstFirm.id,
            contactId: contact?.id,
            toPhone: m.from,
            fromPhone: m.from,
            direction: "inbound",
            status: "received",
            bodyText: m.text?.body,
            metaMessageId: m.id,
          },
        });
      }

      // Delivery / read receipts
      const statuses = (value.statuses as Array<{ id: string; status: string }>) ?? [];
      for (const s of statuses) {
        const map: Record<string, "delivered" | "read" | "sent" | "failed"> = {
          delivered: "delivered",
          read: "read",
          sent: "sent",
          failed: "failed",
        };
        const next = map[s.status];
        if (next) {
          await prisma.waMessage.updateMany({ where: { metaMessageId: s.id }, data: { status: next } });
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
