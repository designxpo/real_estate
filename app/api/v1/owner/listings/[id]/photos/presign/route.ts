import { prisma } from "@/lib/db";
import { presignListingPhoto, isR2Configured } from "@/lib/r2";
import { photoPresignSchema } from "@/lib/owner-validators";
import { ok, fail, preflight, withOwner } from "@/lib/owner-api";

export function OPTIONS() {
  return preflight();
}

// Returns a presigned PUT URL. The app uploads the raw image bytes directly to
// R2 with that URL (Content-Type must match), then calls POST .../photos with
// the returned publicUrl + objectKey to persist it on the listing.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withOwner(req, async (owner) => {
    if (!isR2Configured()) return fail("Photo storage not configured", 503);

    const listing = await prisma.marketplaceListing.findUnique({ where: { id } });
    if (!listing || listing.ownerId !== owner.id) return fail("Listing not found", 404);

    const body = await req.json().catch(() => null);
    const parsed = photoPresignSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid request", 400, parsed.error.flatten());

    const presigned = await presignListingPhoto(id, parsed.data.contentType);
    return ok(presigned);
  });
}
