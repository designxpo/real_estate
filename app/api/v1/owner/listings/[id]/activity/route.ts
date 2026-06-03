// The shared change timeline for one of the owner's listings — the same entries
// the managing broker sees in the portal.
import { prisma } from "@/lib/db";
import { ok, fail, preflight, withOwner } from "@/lib/owner-api";
import { serializeActivity } from "@/lib/listing-activity";

export function OPTIONS() {
  return preflight();
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withOwner(req, async (owner) => {
    const listing = await prisma.marketplaceListing.findUnique({ where: { id }, select: { ownerId: true } });
    if (!listing || listing.ownerId !== owner.id) return fail("Listing not found", 404);
    const activity = await prisma.listingActivityLog.findMany({
      where: { listingId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return ok({ activity: activity.map(serializeActivity) });
  });
}
