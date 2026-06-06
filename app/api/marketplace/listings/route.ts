// Broker-facing marketplace: browse LIVE owner listings (open pool). Subscription
// model — the owner's contact is never exposed. A broker with a buyer BOOKS a
// listing to claim an exclusive close window; booked listings are reserved
// (hidden from others) and only the booking firm still sees them here.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { releaseExpiredBookings, daysLeft } from "@/lib/booking";
import type { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    await releaseExpiredBookings(); // lazy sweep so expired claims relist on browse
    const sp = new URL(req.url).searchParams;

    const and: Prisma.MarketplaceListingWhereInput[] = [
      // Live + (still open) OR (booked by my own firm, so I can manage it).
      {
        OR: [
          { status: "active" },
          { bookings: { some: { firmId: user.firmId, status: "active" } } },
        ],
      },
    ];
    if (sp.get("city")) and.push({ city: { contains: sp.get("city")!, mode: "insensitive" } });
    if (sp.get("listingType")) and.push({ listingType: sp.get("listingType")! as never });
    if (sp.get("propertyType")) and.push({ propertyType: sp.get("propertyType")! as never });
    if (sp.get("bhk")) and.push({ bhk: Number(sp.get("bhk")) });
    const q = sp.get("q");
    if (q) {
      and.push({
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { locality: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    const listings = await prisma.marketplaceListing.findMany({
      where: { moderation: "live", AND: and },
      include: {
        photos: { orderBy: { position: "asc" }, take: 1 },
        owner: { select: { verifiedAt: true } },
        bookings: { where: { status: "active" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    const data = listings.map((l) => {
      const bk = l.bookings[0];
      return {
        id: l.id,
        title: l.title,
        listingType: l.listingType,
        propertyType: l.propertyType,
        bhk: l.bhk,
        price: { amount: Number(l.priceAmount), unit: l.priceUnit, negotiable: l.negotiable },
        locality: l.locality,
        city: l.city,
        photo: l.photos[0]?.url ?? null,
        ownerVerified: !!l.owner.verifiedAt,
        bookingWindowDays: l.bookingWindowDays,
        booking: bk
          ? { id: bk.id, byMyFirm: bk.firmId === user.firmId, daysLeft: daysLeft(bk.expiresAt), expiresAt: bk.expiresAt }
          : null,
      };
    });
    return NextResponse.json({ listings: data });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
