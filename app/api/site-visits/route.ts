import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { leadVisibility } from "@/lib/scope";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  leadId: z.string(),
  propertyId: z.string(),
  scheduledAt: z.coerce.date(),
  subBrokerUserId: z.string().optional(),
  feedback: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;

    const lead = await prisma.lead.findFirst({ where: { id: d.leadId, ...leadVisibility(user) } });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const visit = await prisma.$transaction(async (tx) => {
      const v = await tx.siteVisit.create({
        data: {
          leadId: d.leadId,
          propertyId: d.propertyId,
          scheduledAt: d.scheduledAt,
          subBrokerUserId: d.subBrokerUserId || user.id,
          feedback: d.feedback,
        },
      });
      // Auto-advance the lead unless it's already further along.
      if (["new", "contacted"].includes(lead.stage)) {
        await tx.lead.update({ where: { id: d.leadId }, data: { stage: "site_visit_scheduled" } });
      }
      return v;
    });

    await logActivity({
      firmId: user.firmId,
      userId: user.id,
      entityType: "lead",
      entityId: d.leadId,
      action: "site_visit_scheduled",
    });
    return NextResponse.json({ visit }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
