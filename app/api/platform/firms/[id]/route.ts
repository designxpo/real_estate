// Platform-owner firm actions: change plan, override booking cap, verify/unverify,
// suspend/unsuspend. One PATCH with discriminated `action` to keep it simple.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/auth";
import { requirePlatformAdmin } from "@/lib/platform-auth";
import { getPlan } from "@/lib/plans";
import { releaseFirmBookings } from "@/lib/booking";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set_plan"), planId: z.string().min(1) }),
  z.object({ action: z.literal("override_cap"), maxActiveBookings: z.number().int().min(0).max(100_000) }),
  z.object({ action: z.literal("set_verification"), status: z.enum(["pending", "verified", "rejected"]) }),
  z.object({ action: z.literal("set_suspended"), suspended: z.boolean() }),
]);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }
    const firm = await prisma.firm.findUnique({ where: { id } });
    if (!firm) return NextResponse.json({ error: "Firm not found" }, { status: 404 });

    const d = parsed.data;
    switch (d.action) {
      case "set_plan": {
        // Mirror the broker activation path: set planId + denormalized cap.
        const plan = await getPlan(d.planId);
        await prisma.firm.update({
          where: { id },
          data: {
            planId: plan.id,
            maxActiveBookings: plan.maxActiveBookings,
            subscriptionStatus: "active",
            subscriptionRenewsAt: plan.priceMonthly === 0 ? null : new Date(Date.now() + 30 * 86_400_000),
          },
        });
        break;
      }
      case "override_cap":
        await prisma.firm.update({ where: { id }, data: { maxActiveBookings: d.maxActiveBookings } });
        break;
      case "set_verification":
        await prisma.firm.update({
          where: { id },
          data: { verificationStatus: d.status, verifiedAt: d.status === "verified" ? new Date() : null },
        });
        break;
      case "set_suspended": {
        await prisma.firm.update({ where: { id }, data: { suspendedAt: d.suspended ? new Date() : null } });
        // On suspend, free any listings this firm is holding so owners aren't
        // trapped under a firm that can no longer act.
        let releasedBookings = 0;
        if (d.suspended) releasedBookings = await releaseFirmBookings(id);
        return NextResponse.json({ ok: true, releasedBookings });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}
