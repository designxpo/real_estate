// Public inbound-lead webhook. Portals / Facebook lead ads / website forms POST
// here (JSON or form-encoded). Gated only by the firm's secret webhookToken.
// De-dupes nothing; creates a contact + lead and round-robin assigns it.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { inboundLeadSchema } from "@/lib/validators";
import { normalizePhone } from "@/lib/utils";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notifications";
import type { ContactSource } from "@prisma/client";

const SOURCES: ContactSource[] = [
  "ninetynine_acres", "magicbricks", "housing", "walkin", "whatsapp", "referral", "other",
];

function normalizeSource(raw?: string): ContactSource {
  if (!raw) return "other";
  const s = raw.toLowerCase();
  if (s.includes("99") || s.includes("acres")) return "ninetynine_acres";
  if (s.includes("magic")) return "magicbricks";
  if (s.includes("housing")) return "housing";
  if (s.includes("whatsapp")) return "whatsapp";
  if (s.includes("referr")) return "referral";
  if (SOURCES.includes(s as ContactSource)) return s as ContactSource;
  return "other";
}

async function parseBody(req: Request): Promise<Record<string, unknown> | null> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return req.json().catch(() => null);
  if (ct.includes("form")) {
    const fd = await req.formData().catch(() => null);
    if (!fd) return null;
    return Object.fromEntries(fd.entries());
  }
  return req.json().catch(() => null);
}

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const firm = await prisma.firm.findUnique({ where: { webhookToken: token } });
  if (!firm) return NextResponse.json({ error: "Invalid token" }, { status: 404 });

  const raw = await parseBody(req);
  const parsed = inboundLeadSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  // Round-robin: the firm member with the fewest open leads.
  const members = await prisma.user.findMany({
    where: { firmId: firm.id, role: { in: ["owner", "principal", "sub_broker"] } },
    select: { id: true, _count: { select: { assignedLeads: { where: { stage: { notIn: ["registered", "lost"] } } } } } },
  });
  const assignee = members.sort((a, b) => a._count.assignedLeads - b._count.assignedLeads)[0];

  const contact = await prisma.contact.create({
    data: {
      firmId: firm.id,
      name: d.name,
      phone: normalizePhone(d.phone),
      email: d.email || null,
      type: "buyer",
      source: normalizeSource(d.source),
      assignedToUserId: assignee?.id,
      whatsappOptIn: true,
      whatsappOptInAt: new Date(),
    },
  });

  const lead = await prisma.lead.create({
    data: {
      firmId: firm.id,
      contactId: contact.id,
      propertyId: d.propertyId || null,
      source: normalizeSource(d.source),
      intent: d.intent,
      requirementsText: d.message,
      assignedToUserId: assignee?.id,
      nextFollowupAt: new Date(Date.now() + 60 * 60 * 1000), // 1h
    },
  });

  await logActivity({
    firmId: firm.id,
    entityType: "lead",
    entityId: lead.id,
    action: "inbound_webhook",
    payload: { source: d.source ?? null },
  });
  if (assignee) {
    await notify({
      firmId: firm.id,
      userId: assignee.id,
      kind: "lead_assigned",
      title: `New inbound lead: ${d.name}`,
      href: `/leads/${lead.id}`,
    });
  }
  return NextResponse.json({ ok: true, leadId: lead.id });
}
