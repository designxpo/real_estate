// Detail + edit for a broker-managed marketplace listing. Edits here are logged
// as "broker" in the shared activity timeline (the owner sees them in the app).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { ownerListingUpdateSchema } from "@/lib/owner-validators";
import { serializeListing, makeListingSlug } from "@/lib/owner-listing";
import { logListingActivity, serializeActivity, describeChanges } from "@/lib/listing-activity";
import { geocodeListingIfNeeded } from "@/lib/geocode";
import { emitMarketplaceChange } from "@/lib/realtime";
import type { Prisma } from "@prisma/client";

const detailInclude = {
  photos: true,
  managedByFirm: { select: { id: true, name: true } },
  managedByUser: { select: { id: true, name: true } },
} as const;

// Listing must be managed by this user's firm.
async function managedListing(firmId: string, id: string) {
  const listing = await prisma.marketplaceListing.findUnique({ where: { id }, include: detailInclude });
  if (!listing || listing.managedByFirmId !== firmId) return null;
  return listing;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireUser();
    const listing = await managedListing(user.firmId, id);
    if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const activity = await prisma.listingActivityLog.findMany({
      where: { listingId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ ...serializeListing(listing), activity: activity.map(serializeActivity) });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await requireUser();
    const existing = await managedListing(user.firmId, id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json().catch(() => null);
    const parsed = ownerListingUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }
    const d = parsed.data;
    const firm = await prisma.firm.findUnique({ where: { id: user.firmId }, select: { name: true } });

    const data: Prisma.MarketplaceListingUpdateInput = {};
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

    const statusChanged = d.status !== undefined && d.status !== existing.status;
    if (d.status !== undefined) {
      data.status = d.status;
      if (d.status === "active") {
        if (!existing.publicSlug) data.publicSlug = makeListingSlug(d.title ?? existing.title);
        data.moderation = "live";
      }
    }

    const updated = await prisma.marketplaceListing.update({ where: { id }, data, include: detailInclude });

    // Log: a status change and a field edit are distinct timeline entries.
    if (statusChanged) {
      if (updated.status === "active") await geocodeListingIfNeeded(id);
      await logListingActivity({
        listingId: id,
        actorType: "broker",
        actorName: firm?.name ?? user.name,
        action: "status_change",
        detail: `Status ${existing.status} → ${updated.status} (by ${user.name})`,
      });
      emitMarketplaceChange({ listingId: id, status: updated.status, moderation: updated.moderation, action: "status_change" });
    }
    const detail = describeChanges(existing as unknown as Record<string, unknown>, d as Record<string, unknown>);
    if (detail) {
      await logListingActivity({
        listingId: id,
        actorType: "broker",
        actorName: firm?.name ?? user.name,
        action: "updated",
        detail: `${detail} (by ${user.name})`,
      });
    }

    const activity = await prisma.listingActivityLog.findMany({
      where: { listingId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ ...serializeListing(updated), activity: activity.map(serializeActivity) });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}
