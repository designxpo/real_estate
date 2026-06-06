// Booking lifecycle for marketplace listings (subscription model — the owner's
// contact is NEVER revealed). A broker who has a buyer "books" a live listing to
// claim an exclusive window of N days (set by the owner) to close. If they don't
// close in time the booking auto-expires and the listing relists.
//
//   LIVE ──book(buyer)──▶ BOOKED ──close──▶ CLOSED
//                           └────expire/release────▶ LIVE
import { prisma } from "@/lib/db";
import { logListingActivity } from "@/lib/listing-activity";
import { logActivity } from "@/lib/activity";
import { emitMarketplaceChange } from "@/lib/realtime";
import { notifyProgress } from "@/lib/owner-progress";
import { computeBrokerage } from "@/lib/deals";
import type { DealType, LeadIntent, PriceUnit } from "@prisma/client";

// Convert a listing's price (lakh/crore/per_month/per_sqft) to an absolute rupee
// figure for the deal. Rent stays monthly (brokerage = months × rent).
function toAbsolutePrice(amount: number, unit: PriceUnit, areaSqft: number | null): number {
  switch (unit) {
    case "lakh": return Math.round(amount * 100_000);
    case "crore": return Math.round(amount * 10_000_000);
    case "per_month": return Math.round(amount);
    case "per_sqft": return Math.round(amount * (areaSqft ?? 1));
  }
}

function listingToDealType(listingType: string): DealType {
  if (listingType === "commercial_lease") return "lease";
  if (listingType === "rent" || listingType === "pg") return "rent";
  return "sale";
}

export class BookingError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "BookingError";
  }
}

export async function getActiveBooking(listingId: string) {
  return prisma.listingBooking.findFirst({ where: { listingId, status: "active" } });
}

export async function activeBookingCount(firmId: string): Promise<number> {
  return prisma.listingBooking.count({ where: { firmId, status: "active" } });
}

export interface BookInput {
  listingId: string;
  firmId: string;
  userId: string;
  buyer: { name: string; phone: string; intent?: LeadIntent };
}

// Book a live listing: capacity-check the firm's plan, create the buyer lead,
// lock the listing, start the countdown. Throws BookingError with a code the
// API turns into a clean 4xx.
export async function bookListing(input: BookInput) {
  const listing = await prisma.marketplaceListing.findUnique({ where: { id: input.listingId } });
  if (!listing) throw new BookingError("not_found", "Listing not found");
  if (listing.moderation !== "live" || listing.status !== "active") {
    throw new BookingError("not_available", "This listing isn't open for booking right now");
  }
  if (await getActiveBooking(input.listingId)) {
    throw new BookingError("already_booked", "Another broker has already booked this listing");
  }

  const firm = await prisma.firm.findUnique({
    where: { id: input.firmId },
    select: { name: true, maxActiveBookings: true },
  });
  const cap = firm?.maxActiveBookings ?? 1;
  const current = await activeBookingCount(input.firmId);
  if (current >= cap) {
    throw new BookingError(
      "cap_reached",
      `Your plan allows ${cap} active booking${cap === 1 ? "" : "s"}. Close or release one — or upgrade — to book another.`,
    );
  }

  const windowDays = listing.bookingWindowDays;
  const expiresAt = new Date(Date.now() + windowDays * 86_400_000);

  const booking = await prisma.$transaction(async (tx) => {
    const contact = await tx.contact.create({
      data: { firmId: input.firmId, name: input.buyer.name, phone: input.buyer.phone, type: "buyer" },
    });
    const lead = await tx.lead.create({
      data: {
        firmId: input.firmId,
        contactId: contact.id,
        marketplaceListingId: input.listingId,
        assignedToUserId: input.userId,
        stage: "negotiating", // booking means a buyer is in hand
        intent: input.buyer.intent,
      },
    });
    const created = await tx.listingBooking.create({
      data: {
        listingId: input.listingId,
        firmId: input.firmId,
        userId: input.userId,
        leadId: lead.id,
        windowDays,
        expiresAt,
        status: "active",
      },
    });
    await tx.marketplaceListing.update({ where: { id: input.listingId }, data: { status: "booked" } });
    return created;
  });

  await logListingActivity({
    listingId: input.listingId,
    actorType: "broker",
    actorName: firm?.name ?? "Broker",
    action: "status_change",
    detail: `Booked — ${windowDays}-day window to close (expires ${expiresAt.toISOString().slice(0, 10)})`,
  });
  emitMarketplaceChange({ listingId: input.listingId, status: "booked", moderation: listing.moderation, action: "status_change" });
  await notifyProgress(input.listingId);
  return booking;
}

// Broker marks the deal done within the window. This is the revenue link: it
// creates a Deal (with brokerage) from the marketplace sale so it flows into the
// existing commission/invoice pipeline. Returns the created deal id (if any).
export async function closeBooking(bookingId: string, firmId: string): Promise<{ dealId: string | null }> {
  const booking = await prisma.listingBooking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.firmId !== firmId) throw new BookingError("not_found", "Booking not found");
  if (booking.status !== "active") throw new BookingError("not_active", "This booking is no longer active");

  const listing = await prisma.marketplaceListing.findUnique({ where: { id: booking.listingId } });
  const lead = booking.leadId
    ? await prisma.lead.findUnique({ where: { id: booking.leadId }, select: { contactId: true } })
    : null;
  const broker = await prisma.user.findUnique({
    where: { id: booking.userId },
    select: { commissionDefaultPct: true },
  });

  const now = new Date();
  let dealId: string | null = null;

  await prisma.$transaction(async (tx) => {
    await tx.listingBooking.update({ where: { id: bookingId }, data: { status: "closed", closedAt: now } });
    await tx.marketplaceListing.update({ where: { id: booking.listingId }, data: { status: "closed" } });
    if (booking.leadId) {
      await tx.lead.updateMany({ where: { id: booking.leadId }, data: { stage: "registered" } });
    }

    // Create the Deal so the sale enters the commission / invoice pipeline.
    if (listing && lead?.contactId) {
      const dealType = listingToDealType(listing.listingType);
      const agreedPrice = toAbsolutePrice(Number(listing.priceAmount), listing.priceUnit, listing.carpetSqft ?? listing.builtupSqft);
      const pct = dealType === "rent" ? null : Number(broker?.commissionDefaultPct ?? 1);
      const rentMonths = dealType === "rent" ? 1 : null; // default 1 month brokerage; broker can edit
      const brokerage = computeBrokerage({
        dealType,
        agreedPrice,
        brokeragePctBuyerSide: pct,
        rentMonthsBuyerSide: rentMonths,
      });
      const deal = await tx.deal.create({
        data: {
          firmId,
          marketplaceListingId: listing.id,
          buyerContactId: lead.contactId,
          leadId: booking.leadId,
          dealType,
          agreedPrice,
          brokeragePctBuyerSide: pct,
          brokerageAmountBuyer: brokerage.buyer,
          brokerageAmountSeller: brokerage.seller,
          totalBrokerage: brokerage.total,
          stage: "completed",
          registrationDate: now,
          primaryBrokerUserId: booking.userId,
          notes: "Auto-created from a marketplace booking. Review the price & brokerage.",
        },
      });
      dealId = deal.id;
    }
  });

  if (dealId) {
    await logActivity({ firmId, userId: booking.userId, entityType: "deal", entityId: dealId, action: "create" });
  }

  const firm = await prisma.firm.findUnique({ where: { id: firmId }, select: { name: true } });
  await logListingActivity({
    listingId: booking.listingId,
    actorType: "broker",
    actorName: firm?.name ?? "Broker",
    action: "status_change",
    detail: "Deal closed 🎉",
  });
  emitMarketplaceChange({ listingId: booking.listingId, status: "closed", moderation: "live", action: "status_change" });
  await notifyProgress(booking.listingId);
  return { dealId };
}

// Broker releases their claim early (frees the slot, relists the property).
export async function releaseBooking(bookingId: string, firmId: string) {
  const booking = await prisma.listingBooking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.firmId !== firmId) throw new BookingError("not_found", "Booking not found");
  if (booking.status !== "active") throw new BookingError("not_active", "This booking is no longer active");
  await _release(booking.id, booking.listingId, booking.leadId, "cancelled", "Broker released the booking — relisted");
}

// Release ALL of a firm's active bookings — used when the platform operator
// suspends a firm, so its claims don't trap owners' listings under a firm that
// can no longer act. Each freed listing relists to the marketplace. Returns the
// number released. Reversible in effect: after unsuspend a broker can re-book.
export async function releaseFirmBookings(firmId: string): Promise<number> {
  const active = await prisma.listingBooking.findMany({ where: { firmId, status: "active" } });
  for (const b of active) {
    await _release(b.id, b.listingId, b.leadId, "cancelled", "Broker firm suspended — booking released, listing relisted");
  }
  return active.length;
}

// Sweep expired bookings → relist. Safe to call repeatedly (lazy + cron).
export async function releaseExpiredBookings(): Promise<number> {
  const due = await prisma.listingBooking.findMany({
    where: { status: "active", expiresAt: { lt: new Date() } },
  });
  for (const b of due) {
    await _release(b.id, b.listingId, b.leadId, "expired", "Booking window expired — relisted to the marketplace");
  }
  return due.length;
}

async function _release(
  bookingId: string,
  listingId: string,
  leadId: string | null,
  status: "expired" | "cancelled",
  detail: string,
) {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.listingBooking.update({ where: { id: bookingId }, data: { status, releasedAt: now } });
    // Only relist if the listing is still booked (not already closed/withdrawn).
    await tx.marketplaceListing.updateMany({ where: { id: listingId, status: "booked" }, data: { status: "active" } });
    if (leadId) {
      await tx.lead.updateMany({
        where: { id: leadId, stage: { notIn: ["registered", "lost"] } },
        data: { stage: "lost", lostReason: status === "expired" ? "Booking window expired" : "Booking released" },
      });
    }
  });
  await logListingActivity({ listingId, actorType: "broker", actorName: "System", action: "status_change", detail });
  emitMarketplaceChange({ listingId, status: "active", moderation: "live", action: "status_change" });
  await notifyProgress(listingId);
}

// Days remaining on an active booking (ceil, min 0) — for UI countdowns.
export function daysLeft(expiresAt: Date): number {
  return Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000));
}
