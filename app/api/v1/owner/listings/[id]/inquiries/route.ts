// Brokers who unlocked this owner's listing — the owner's "interested brokers"
// inbox, so they can call/WhatsApp back. Includes the live lead stage if that
// broker is actively working a buyer for this listing.
import { prisma } from "@/lib/db";
import { ok, fail, preflight, withOwner } from "@/lib/owner-api";

export function OPTIONS() {
  return preflight();
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withOwner(req, async (owner) => {
    const listing = await prisma.marketplaceListing.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    if (!listing || listing.ownerId !== owner.id) return fail("Listing not found", 404);

    const unlocks = await prisma.listingUnlock.findMany({
      where: { listingId: id },
      orderBy: { createdAt: "desc" },
    });
    if (unlocks.length === 0) return ok({ inquiries: [] });

    // ListingUnlock stores plain firmId/userId; resolve broker + firm + their
    // furthest lead stage on this listing.
    const userIds = [...new Set(unlocks.map((u) => u.userId))];
    const firmIds = [...new Set(unlocks.map((u) => u.firmId))];
    const [users, firms, leads] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, phone: true } }),
      prisma.firm.findMany({ where: { id: { in: firmIds } }, select: { id: true, name: true } }),
      prisma.lead.findMany({
        where: { marketplaceListingId: id },
        select: { firmId: true, stage: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
    ]);
    const userMap = new Map(users.map((u) => [u.id, u]));
    const firmMap = new Map(firms.map((f) => [f.id, f]));
    const stageByFirm = new Map<string, string>();
    for (const l of leads) {
      if (!stageByFirm.has(l.firmId)) stageByFirm.set(l.firmId, l.stage); // newest = furthest activity
    }

    const inquiries = unlocks.map((u) => ({
      brokerName: userMap.get(u.userId)?.name ?? "Broker",
      brokerPhone: userMap.get(u.userId)?.phone ?? null,
      firmName: firmMap.get(u.firmId)?.name ?? null,
      unlockedAt: u.createdAt,
      leadStage: stageByFirm.get(u.firmId) ?? null,
    }));
    return ok({ inquiries });
  });
}
