import { prisma } from "@/lib/db";
import { photoAttachSchema } from "@/lib/owner-validators";
import { ok, fail, preflight, withOwner } from "@/lib/owner-api";

export function OPTIONS() {
  return preflight();
}

// Persist a photo on the listing AFTER the app has uploaded it to R2 via the
// presigned URL. Position defaults to the next slot.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withOwner(req, async (owner) => {
    const listing = await prisma.marketplaceListing.findUnique({
      where: { id },
      include: { photos: true },
    });
    if (!listing || listing.ownerId !== owner.id) return fail("Listing not found", 404);

    const body = await req.json().catch(() => null);
    const parsed = photoAttachSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid request", 400, parsed.error.flatten());
    const d = parsed.data;

    const position = d.position ?? listing.photos.length;
    const photo = await prisma.marketplaceListingPhoto.create({
      data: { listingId: id, url: d.url, objectKey: d.objectKey, caption: d.caption, position },
    });
    return ok({ id: photo.id, url: photo.url, caption: photo.caption, position: photo.position }, 201);
  });
}

// Remove a photo (?photoId=...).
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withOwner(req, async (owner) => {
    const photoId = new URL(req.url).searchParams.get("photoId");
    if (!photoId) return fail("photoId required", 400);

    const listing = await prisma.marketplaceListing.findUnique({ where: { id } });
    if (!listing || listing.ownerId !== owner.id) return fail("Listing not found", 404);

    await prisma.marketplaceListingPhoto.deleteMany({ where: { id: photoId, listingId: id } });
    return ok({ ok: true });
  });
}
