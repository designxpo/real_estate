// Broker unlocks an owner listing's contact. Open-pool model: many firms can
// unlock the same listing. Idempotent per (listing, firm). This is where credit
// decrement / billing would hook in (brokers pay).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;

    const listing = await prisma.marketplaceListing.findFirst({
      where: { id, moderation: "live", status: "active" },
      include: { owner: { select: { name: true, phone: true } } },
    });
    if (!listing) return NextResponse.json({ error: "Listing not available" }, { status: 404 });

    await prisma.listingUnlock.upsert({
      where: { listingId_firmId: { listingId: id, firmId: user.firmId } },
      create: { listingId: id, firmId: user.firmId, userId: user.id },
      update: {},
    });

    await logActivity({
      firmId: user.firmId,
      userId: user.id,
      entityType: "marketplace_listing",
      entityId: id,
      action: "unlock",
    });

    return NextResponse.json({
      ok: true,
      owner: { name: listing.owner.name, phone: listing.owner.phone },
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}
