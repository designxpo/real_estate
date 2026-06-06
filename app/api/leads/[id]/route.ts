import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { leadVisibility } from "@/lib/scope";
import { leadUpdateSchema } from "@/lib/validators";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notifications";
import { notifyProgress } from "@/lib/owner-progress";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const lead = await prisma.lead.findFirst({
      where: { id, ...leadVisibility(user) },
      include: {
        contact: true,
        property: { select: { id: true, title: true } },
        assignedTo: { select: { id: true, name: true } },
        siteVisits: { orderBy: { scheduledAt: "desc" } },
      },
    });
    if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ lead });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const existing = await prisma.lead.findFirst({ where: { id, ...leadVisibility(user) } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json().catch(() => null);
    const parsed = leadUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        stage: d.stage,
        assignedToUserId: d.assignedToUserId,
        nextFollowupAt: d.nextFollowupAt,
        intent: d.intent,
        budgetMin: d.budgetMin,
        budgetMax: d.budgetMax,
        requirementsText: d.requirementsText,
        lostReason: d.lostReason,
        propertyId: d.propertyId,
      },
    });

    if (d.stage && d.stage !== existing.stage) {
      await logActivity({
        firmId: user.firmId,
        userId: user.id,
        entityType: "lead",
        entityId: id,
        action: "stage_change",
        payload: { from: existing.stage, to: d.stage },
      });
      // If this lead is working an owner listing, push the owner's live progress.
      if (lead.marketplaceListingId) await notifyProgress(lead.marketplaceListingId);
    }

    // Reassignment notifies the new owner.
    if (d.assignedToUserId && d.assignedToUserId !== existing.assignedToUserId) {
      await notify({
        firmId: user.firmId,
        userId: d.assignedToUserId,
        kind: "lead_assigned",
        title: "New lead assigned to you",
        href: `/leads/${id}`,
      });
    }
    return NextResponse.json({ lead });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
