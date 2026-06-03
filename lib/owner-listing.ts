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
  bookings?: { status: string; expiresAt: Date; firm?: { name: string } | null }[];
};

function daysLeftFrom(expiresAt: Date): number {
  return Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000));
}

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
    // Owner-set exclusivity window (days a booking broker gets to close).
    bookingWindowDays: l.bookingWindowDays,
    // Present when a broker firm manages this listing on the owner's behalf.
    managedBy: l.managedByFirm
      ? { firmId: l.managedByFirm.id, firmName: l.managedByFirm.name, brokerName: l.managedByUser?.name ?? null }
      : null,
    // Active booking (a broker is closing within their window), if any.
    booking: (() => {
      const b = (l.bookings ?? []).find((x) => x.status === "active");
      return b
        ? { firmName: b.firm?.name ?? null, status: b.status, expiresAt: b.expiresAt, daysLeft: daysLeftFrom(b.expiresAt) }
        : null;
    })(),
    photos: (l.photos ?? [])
      .sort((a, b) => a.position - b.position)
      .map((p) => ({ id: p.id, url: p.url, caption: p.caption, position: p.position })),
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  };
}
