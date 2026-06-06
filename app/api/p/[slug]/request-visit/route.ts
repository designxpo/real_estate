// Public endpoint behind a property's public page. Creates a contact + lead and
// assigns to the listing broker. Rate-limited to stop lead-spam / notification
// abuse (swap the in-memory limiter for Redis in multi-instance prod).
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/utils";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notifications";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().min(8).max(20),
  message: z.string().max(1000).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const phone = normalizePhone(parsed.data.phone);

  // Primary limit keys on the phone+slug (an attacker can't rotate the submitted
  // phone to keep spamming the same broker), with IP+slug as a best-effort
  // secondary limit. X-Forwarded-For alone is spoofable, so it's never the only key.
  const byPhone = rateLimit(`visit:phone:${phone}:${slug}`, 3, 60 * 60 * 1000); // 3 / hour
  if (!byPhone.ok) return tooMany(byPhone.retryAfterSec);
  const byIp = rateLimit(`visit:ip:${clientIp(req)}:${slug}`, 5, 60 * 1000); // 5 / min
  if (!byIp.ok) return tooMany(byIp.retryAfterSec);

  const property = await prisma.property.findUnique({ where: { publicSlug: slug } });
  if (!property || !property.publicEnabled) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const contact = await prisma.contact.create({
    data: {
      firmId: property.firmId,
      name: parsed.data.name,
      phone: normalizePhone(parsed.data.phone),
      type: "buyer",
      source: "other",
      assignedToUserId: property.listedByUserId,
    },
  });

  const lead = await prisma.lead.create({
    data: {
      firmId: property.firmId,
      contactId: contact.id,
      propertyId: property.id,
      source: "other",
      requirementsText: parsed.data.message,
      assignedToUserId: property.listedByUserId,
      nextFollowupAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  await logActivity({
    firmId: property.firmId,
    entityType: "lead",
    entityId: lead.id,
    action: "public_request_visit",
  });
  await notify({
    firmId: property.firmId,
    userId: property.listedByUserId,
    kind: "lead_assigned",
    title: `Visit request: ${property.title}`,
    body: `${parsed.data.name} requested a visit.`,
    href: `/leads/${lead.id}`,
  });

  return NextResponse.json({ ok: true });
}
