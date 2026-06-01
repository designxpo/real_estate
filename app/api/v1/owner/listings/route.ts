import { prisma } from "@/lib/db";
import { ownerListingCreateSchema } from "@/lib/owner-validators";
import { serializeListing } from "@/lib/owner-listing";
import { ok, fail, preflight, withOwner } from "@/lib/owner-api";

export function OPTIONS() {
  return preflight();
}

// List the authenticated owner's own listings (newest first).
export async function GET(req: Request) {
  return withOwner(req, async (owner) => {
    const listings = await prisma.marketplaceListing.findMany({
      where: { ownerId: owner.id },
      include: { photos: true },
      orderBy: { createdAt: "desc" },
    });
    return ok({ listings: listings.map(serializeListing) });
  });
}

// Create a listing. Always starts as a draft pending review; the owner submits
// for review by PATCHing status -> active.
export async function POST(req: Request) {
  return withOwner(req, async (owner) => {
    const body = await req.json().catch(() => null);
    const parsed = ownerListingCreateSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid request", 400, parsed.error.flatten());
    const d = parsed.data;

    const listing = await prisma.marketplaceListing.create({
      data: {
        ownerId: owner.id,
        title: d.title,
        description: d.description,
        listingType: d.listingType,
        propertyType: d.propertyType,
        bhk: d.bhk,
        carpetSqft: d.carpetSqft,
        builtupSqft: d.builtupSqft,
        priceAmount: d.priceAmount,
        priceUnit: d.priceUnit,
        negotiable: d.negotiable ?? true,
        maintenanceAmount: d.maintenanceAmount,
        depositMonths: d.depositMonths,
        addressLine: d.addressLine,
        locality: d.locality,
        city: d.city,
        state: d.state,
        pincode: d.pincode || null,
        lat: d.lat,
        lng: d.lng,
        amenities: d.amenities ?? [],
        furnishing: d.furnishing,
        availableFrom: d.availableFrom,
        reraId: d.reraId,
        status: "draft",
        moderation: "pending_review",
      },
      include: { photos: true },
    });
    return ok(serializeListing(listing), 201);
  });
}
