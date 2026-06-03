// Helpers for marketplace listings: JSON serialization for the API and a
// public-slug generator used when a listing first goes active.
import { randomBytes } from "crypto";
import type { MarketplaceListing, MarketplaceListingPhoto } from "@prisma/client";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}

export function makeListingSlug(title: string): string {
  const base = slugify(title) || "listing";
  return `${base}-${randomBytes(3).toString("hex")}`;
}

type ListingWithPhotos = MarketplaceListing & {
  photos?: MarketplaceListingPhoto[];
  managedByFirm?: { id: string; name: string } | null;
  managedByUser?: { id: string; name: string } | null;
};

// Decimal fields come back as Prisma.Decimal; coerce to number for JSON.
function num(d: unknown): number | null {
  if (d === null || d === undefined) return null;
  return Number(d);
}

export function serializeListing(l: ListingWithPhotos) {
  return {
    id: l.id,
    title: l.title,
    description: l.description,
    listingType: l.listingType,
    propertyType: l.propertyType,
    bhk: l.bhk,
    carpetSqft: l.carpetSqft,
    builtupSqft: l.builtupSqft,
    price: { amount: num(l.priceAmount), unit: l.priceUnit, negotiable: l.negotiable },
    maintenanceAmount: num(l.maintenanceAmount),
    depositMonths: l.depositMonths,
    location: {
      addressLine: l.addressLine,
      locality: l.locality,
      city: l.city,
      state: l.state,
      pincode: l.pincode,
      lat: l.lat,
      lng: l.lng,
    },
    amenities: l.amenities,
    furnishing: l.furnishing,
    availableFrom: l.availableFrom,
    reraId: l.reraId,
    status: l.status,
    moderation: l.moderation,
    publicSlug: l.publicSlug,
    // Present when a broker firm manages this listing on the owner's behalf.
    managedBy: l.managedByFirm
      ? { firmId: l.managedByFirm.id, firmName: l.managedByFirm.name, brokerName: l.managedByUser?.name ?? null }
      : null,
    photos: (l.photos ?? [])
      .sort((a, b) => a.position - b.position)
      .map((p) => ({ id: p.id, url: p.url, caption: p.caption, position: p.position })),
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  };
}
