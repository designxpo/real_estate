// Broker-facing marketplace: browse LIVE owner listings (open pool). The owner's
// contact is hidden until this firm unlocks the listing.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const sp = new URL(req.url).searchParams;

    const where: Prisma.MarketplaceListingWhereInput = {
      moderation: "live",
      status: "active",
    };
    if (sp.get("city")) where.city = { contains: sp.get("city")!, mode: "insensitive" };
    if (sp.get("listingType")) where.listingType = sp.get("listingType")! as never;
    if (sp.get("propertyType")) where.propertyType = sp.get("propertyType")! as never;
    if (sp.get("bhk")) where.bhk = Number(sp.get("bhk"));
    const q = sp.get("q");
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { locality: { contains: q, mode: "insensitive" } },
      ];
    }

    const listings = await prisma.marketplaceListing.findMany({
      where,
      include: {
        photos: { orderBy: { position: "asc" }, take: 1 },
        owner: { select: { name: true, phone: true, verifiedAt: true } },
        unlocks: { where: { firmId: user.firmId }, select: { id: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    const data = listings.map((l) => {
      const unlocked = l.unlocks.length > 0;
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
        unlocked,
        owner: unlocked ? { name: l.owner.name, phone: l.owner.phone } : null,
      };
    });
    return NextResponse.json({ listings: data });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}
