// Broker-portal B2B2C: a firm lists & manages a property on behalf of an owner.
// Creating one finds-or-creates the Owner (by phone) so the owner can log into
// the mobile app with that number and watch / edit the same listing.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { normalizePhone } from "@/lib/utils";
import { brokerManagedListingCreateSchema } from "@/lib/owner-validators";
import { serializeListing, makeListingSlug } from "@/lib/owner-listing";
import { logListingActivity } from "@/lib/listing-activity";
import { geocodeListingIfNeeded } from "@/lib/geocode";
import { emitMarketplaceChange } from "@/lib/realtime";

// All marketplace listings this firm manages on behalf of owners.
export async function GET() {
  try {
    const user = await requireUser();
    const listings = await prisma.marketplaceListing.findMany({
      where: { managedByFirmId: user.firmId },
      include: {
        photos: { orderBy: { position: "asc" }, take: 1 },
        owner: { select: { name: true, phone: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    const data = listings.map((l) => ({
      id: l.id,
      title: l.title,
      status: l.status,
      moderation: l.moderation,
      listingType: l.listingType,
      propertyType: l.propertyType,
      bhk: l.bhk,
      price: { amount: Number(l.priceAmount), unit: l.priceUnit },
      locality: l.locality,
      city: l.city,
      photo: l.photos[0]?.url ?? null,
      owner: { name: l.owner.name, phone: l.owner.phone },
      updatedAt: l.updatedAt,
    }));
    return NextResponse.json({ listings: data });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = brokerManagedListingCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }
    const { owner: ownerInput, listing: d } = parsed.data;
    const firm = await prisma.firm.findUnique({ where: { id: user.firmId }, select: { name: true } });

    const phone = normalizePhone(ownerInput.phone);
    // Find-or-create the owner account by phone (the app logs in via OTP on this number).
    let owner = await prisma.owner.findUnique({ where: { phone } });
    if (!owner) {
      owner = await prisma.owner.create({
        data: { phone, name: ownerInput.name.trim(), email: ownerInput.email || null },
      });
    }

    const goLive = d.status === "active";
    const listing = await prisma.marketplaceListing.create({
      data: {
        ownerId: owner.id,
        managedByFirmId: user.firmId,
        managedByUserId: user.id,
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
        status: goLive ? "active" : "draft",
        moderation: goLive ? "live" : "pending_review",
        publicSlug: goLive ? makeListingSlug(d.title) : null,
      },
      include: { photos: true, managedByFirm: { select: { id: true, name: true } }, managedByUser: { select: { id: true, name: true } } },
    });

    await logListingActivity({
      listingId: listing.id,
      actorType: "broker",
      actorName: firm?.name ?? user.name,
      action: "created",
      detail: `Listing created by ${user.name}${goLive ? " · published live" : " · saved as draft"}`,
    });

    if (goLive) {
      await geocodeListingIfNeeded(listing.id);
      emitMarketplaceChange({ listingId: listing.id, status: "active", moderation: "live", action: "status_change" });
    }
    return NextResponse.json(serializeListing(listing), { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
