// Public endpoint behind a property's public page. Creates a contact + lead and
// assigns to the listing broker. In-memory rate limit (swap to Redis in prod).
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/utils";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notifications";

const schema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().min(8).max(20),
  message: z.string().max(1000).optional(),
});

const hits = new Map<string, number[]>();
function rateLimited(key: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > 5;
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const ip = req.headers.get("x-forwarded-for") ?? "anon";
  if (rateLimited(`${ip}:${slug}`)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

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
