// Broadcast engine (§4F): resolve a segment → recipients, merge the template,
// respect opt-out, deliver best-effort (WhatsApp/SMS gated like other integrations).
import { prisma } from "@/lib/db";
import { isWhatsappConfigured, sendTemplateMessage } from "@/lib/whatsapp";
import { currentPeriodMonth, periodLabel } from "@/lib/rent";

export type Segment = "tenants" | "leads" | "team";

export interface Recipient {
  name: string;
  phone: string;
  vars: Record<string, string>;
  optedOut: boolean; // whatsapp opt-out (contacts/leads only)
}

export const MERGE_TAGS = ["name", "unit", "rentDue", "firm"] as const;

export function renderTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

// Resolve a segment to recipients (with merge vars + opt-out flag).
export async function resolveSegment(firmId: string, segment: Segment, filter?: string | null): Promise<Recipient[]> {
  const firm = await prisma.firm.findUnique({ where: { id: firmId }, select: { name: true } });
  const firmName = firm?.name ?? "";

  if (segment === "team") {
    const users = await prisma.user.findMany({ where: { firmId, role: "sub_broker" }, select: { name: true, phone: true } });
    return users.map((u) => ({ name: u.name, phone: u.phone, optedOut: false, vars: { name: u.name, firm: firmName, unit: "", rentDue: "" } }));
  }

  if (segment === "leads") {
    const where = { firmId, ...(filter ? { stage: filter as never } : {}) };
    const leads = await prisma.lead.findMany({ where, include: { contact: { select: { name: true, phone: true, whatsappOptIn: true } } } });
    // De-dupe by phone.
    const seen = new Set<string>();
    const out: Recipient[] = [];
    for (const l of leads) {
      if (seen.has(l.contact.phone)) continue;
      seen.add(l.contact.phone);
      out.push({
        name: l.contact.name,
        phone: l.contact.phone,
        optedOut: !l.contact.whatsappOptIn,
        vars: { name: l.contact.name, firm: firmName, unit: "", rentDue: "" },
      });
    }
    return out;
  }

  // tenants — active leases, optionally filtered by building.
  const leases = await prisma.pmLease.findMany({
    where: { firmId, status: "active", ...(filter ? { unit: { building: filter } } : {}) },
    include: { tenant: { select: { name: true, phone: true } }, unit: { select: { label: true, building: true } }, charges: { where: { periodMonth: currentPeriodMonth() }, take: 1 } },
  });
  return leases.map((l) => {
    const charge = l.charges[0];
    const due = charge ? Number(charge.amount) - Number(charge.paidAmount) : Number(l.rentAmount);
    return {
      name: l.tenant.name,
      phone: l.tenant.phone,
      optedOut: false,
      vars: {
        name: l.tenant.name,
        firm: firmName,
        unit: [l.unit.building, l.unit.label].filter(Boolean).join(" "),
        rentDue: `₹${Math.round(due).toLocaleString("en-IN")} for ${periodLabel(currentPeriodMonth())}`,
      },
    };
  });
}

// Deliver one merged message. Gated: real send only when the channel is
// configured + a WhatsApp broadcast template is set; otherwise "queued" (dev).
async function deliverOne(channel: string, phone: string, body: string): Promise<"sent" | "failed" | "queued"> {
  if (channel === "whatsapp" && isWhatsappConfigured() && process.env.WHATSAPP_BROADCAST_TEMPLATE) {
    const res = await sendTemplateMessage({
      to: phone.replace(/^\+/, ""),
      templateName: process.env.WHATSAPP_BROADCAST_TEMPLATE,
      variables: [body],
    });
    return res.ok ? "sent" : "failed";
  }
  // SMS or unconfigured WhatsApp → record as queued (dev). Real SMS send wires here.
  return "queued";
}

export interface DeliverResult { total: number; sent: number; queued: number; skipped: number }

export async function runBroadcast(opts: {
  firmId: string;
  userId: string;
  segment: Segment;
  filter?: string | null;
  channel: string;
  body: string;
}): Promise<{ broadcastId: string; result: DeliverResult }> {
  const recipients = await resolveSegment(opts.firmId, opts.segment, opts.filter);

  const broadcast = await prisma.broadcast.create({
    data: {
      firmId: opts.firmId,
      segment: opts.segment,
      filter: opts.filter || null,
      channel: opts.channel,
      body: opts.body,
      createdByUserId: opts.userId,
      totalCount: recipients.length,
    },
  });

  const result: DeliverResult = { total: recipients.length, sent: 0, queued: 0, skipped: 0 };
  for (const r of recipients) {
    // Honour WhatsApp opt-out for contact/lead recipients.
    if (opts.channel === "whatsapp" && r.optedOut) {
      await prisma.broadcastRecipient.create({ data: { broadcastId: broadcast.id, name: r.name, phone: r.phone, body: "", status: "skipped_optout" } });
      result.skipped++;
      continue;
    }
    const merged = renderTemplate(opts.body, r.vars);
    const status = await deliverOne(opts.channel, r.phone, merged);
    await prisma.broadcastRecipient.create({ data: { broadcastId: broadcast.id, name: r.name, phone: r.phone, body: merged, status } });
    if (status === "sent") result.sent++;
    else if (status === "queued") result.queued++;
  }

  await prisma.broadcast.update({ where: { id: broadcast.id }, data: { sentCount: result.sent } });
  return { broadcastId: broadcast.id, result };
}
