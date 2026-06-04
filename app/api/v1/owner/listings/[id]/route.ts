import { prisma } from "@/lib/db";
import { ownerListingUpdateSchema } from "@/lib/owner-validators";
import { serializeListing, makeListingSlug } from "@/lib/owner-listing";
import { ok, fail, preflight, withOwner } from "@/lib/owner-api";
import { emitMarketplaceChange } from "@/lib/realtime";
import { logListingActivity, describeChanges } from "@/lib/listing-activity";
import { geocodeListingIfNeeded } from "@/lib/geocode";
import type { Prisma } from "@prisma/client";

export function OPTIONS() {
  return preflight();
}

const detailInclude = {
  photos: true,
  managedByFirm: { select: { id: true, name: true } },
  managedByUser: { select: { id: true, name: true } },
  bookings: { where: { status: "active" as const }, take: 1, include: { firm: { select: { name: true } } } },
} as const;

async function ownedListing(ownerId: string, id: string) {
  const listing = await prisma.marketplaceListing.findUnique({
    where: { id },
    include: detailInclude,
  });
  if (!listing || listing.ownerId !== ownerId) return null;
  return listing;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withOwner(req, async (owner) => {
    const listing = await ownedListing(owner.id, id);
    if (!listing) return fail("Listing not found", 404);
    return ok(serializeListing(listing));
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withOwner(req, async (owner) => {
    const existing = await ownedListing(owner.id, id);
    if (!existing) return fail("Listing not found", 404);

    const body = await req.json().catch(() => null);
    const parsed = ownerListingUpdateSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid request", 400, parsed.error.flatten());
    const d = parsed.data;

    const data: Prisma.MarketplaceListingUpdateInput = {};
    // Copy through any provided scalar fields.
    const scalarKeys = [
      "title", "description", "listingType", "propertyType", "bhk", "carpetSqft",
      "builtupSqft", "negotiable", "depositMonths", "addressLine", "locality",
      "city", "state", "lat", "lng", "amenities", "furnishing", "availableFrom", "reraId",
      "bookingWindowDays",
    ] as const;
    for (const k of scalarKeys) {
      if (d[k] !== undefined) (data as Record<string, unknown>)[k] = d[k];
    }
    if (d.priceAmount !== undefined) data.priceAmount = d.priceAmount;
    if (d.priceUnit !== undefined) data.priceUnit = d.priceUnit;
    if (d.maintenanceAmount !== undefined) data.maintenanceAmount = d.maintenanceAmount;
    if (d.pincode !== undefined) data.pincode = d.pincode || null;

    // Status transitions. Activating publishes the listing to the broker
    // marketplace. MVP: auto-approve (moderation -> live) on activate; a manual
    // moderation queue can be reintroduced later by setting "pending_review".
    if (d.status !== undefined) {
      data.status = d.status;
      if (d.status === "active") {
        if (!existing.publicSlug) data.publicSlug = makeListingSlug(d.title ?? existing.title);
        data.moderation = "live";
      }
    }

    const statusChanged = d.status !== undefined && d.status !== existing.status;
    const updated = await prisma.marketplaceListing.update({
      where: { id },
      data,
      include: detailInclude,
    });

    // Record both kinds of change in the shared timeline (broker sees these in
    // the portal). Only meaningful for managed listings, but harmless otherwise.
    if (statusChanged) {
      // Going live → make sure it has map coordinates for discovery.
      if (updated.status === "active") await geocodeListingIfNeeded(id);
      await logListingActivity({
        listingId: id,
        actorType: "owner",
        actorName: owner.name,
        action: "status_change",
        detail: `Status ${existing.status} → ${updated.status} (by owner)`,
      });
      // Push a real-time event to brokers when status/visibility changed.
      emitMarketplaceChange({
        listingId: id,
        status: updated.status,
        moderation: updated.moderation,
        action: "status_change",
      });
    }
    const changeDetail = describeChanges(existing as unknown as Record<string, unknown>, d as Record<string, unknown>);
    if (changeDetail) {
      await logListingActivity({
        listingId: id,
        actorType: "owner",
        actorName: owner.name,
        action: "updated",
        detail: `${changeDetail} (by owner)`,
      });
    }
    return ok(serializeListing(updated));
  });
}
