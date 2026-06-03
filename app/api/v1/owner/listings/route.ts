import { prisma } from "@/lib/db";
import { ownerListingCreateSchema } from "@/lib/owner-validators";
import { serializeListing } from "@/lib/owner-listing";
import { ok, fail, preflight, withOwner } from "@/lib/owner-api";
import { logListingActivity } from "@/lib/listing-activity";

export function OPTIONS() {
  return preflight();
}

// List the authenticated owner's own listings (newest first).
export async function GET(req: Request) {
  return withOwner(req, async (owner) => {
    const listings = await prisma.marketplaceListing.findMany({
      where: { ownerId: owner.id },
      include: {
        photos: true,
        managedByFirm: { select: { id: true, name: true } },
        managedByUser: { select: { id: true, name: true } },
        bookings: { where: { status: "active" }, take: 1, include: { firm: { select: { name: true } } } },
      },
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
        bookingWindowDays: d.bookingWindowDays ?? undefined,
        status: "draft",
        moderation: "pending_review",
      },
      include: { photos: true },
    });
    await logListingActivity({
      listingId: listing.id,
      actorType: "owner",
      actorName: owner.name,
      action: "created",
      detail: "Listing created by owner",
    });
    return ok(serializeListing(listing), 201);
  });
}
