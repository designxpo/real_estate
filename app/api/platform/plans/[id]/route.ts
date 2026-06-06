// Edit or retire a plan. PATCH updates fields (and optionally pushes price/cap to
// current subscribers); DELETE soft-retires (active=false) so existing firms keep
// their plan reference. The Free plan can't be retired.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/auth";
import { requirePlatformAdmin } from "@/lib/platform-auth";
import { FREE_PLAN_ID } from "@/lib/plans";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  tagline: z.string().trim().max(120).optional(),
  priceMonthly: z.number().int().min(0).max(10_000_000).optional(),
  maxActiveBookings: z.number().int().min(0).max(100_000).optional(),
  features: z.array(z.string().trim().max(80)).max(20).optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
  // When true, push the new maxActiveBookings to every firm currently on this plan.
  applyToSubscribers: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid update", details: parsed.error.flatten() }, { status: 400 });
    }
    const existing = await prisma.plan.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const { applyToSubscribers, ...fields } = parsed.data;
    if (id === FREE_PLAN_ID && fields.active === false) {
      return NextResponse.json({ error: "The Free plan cannot be retired" }, { status: 400 });
    }

    const plan = await prisma.plan.update({ where: { id }, data: fields });

    let updatedSubscribers = 0;
    if (applyToSubscribers && fields.maxActiveBookings !== undefined) {
      const res = await prisma.firm.updateMany({
        where: { planId: id },
        data: { maxActiveBookings: fields.maxActiveBookings },
      });
      updatedSubscribers = res.count;
    }
    return NextResponse.json({ plan, updatedSubscribers });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    if (id === FREE_PLAN_ID) {
      return NextResponse.json({ error: "The Free plan cannot be retired" }, { status: 400 });
    }
    const existing = await prisma.plan.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    // Soft-retire: keep the row so firms referencing it still resolve.
    const plan = await prisma.plan.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ plan });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}
