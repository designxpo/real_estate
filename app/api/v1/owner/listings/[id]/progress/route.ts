// Owner-facing deal-progress for one of their listings (the Amazon-style stepper).
import { prisma } from "@/lib/db";
import { computeProgress } from "@/lib/owner-progress";
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
    const result = await computeProgress(id);
    if (!result) return fail("Listing not found", 404);
    return ok(result.progress);
  });
}
