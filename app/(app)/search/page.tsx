import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth";
import { formatINR } from "@/lib/utils";
import { daysLeft } from "@/lib/booking";
import { MapSearch } from "@/components/map-search";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const MODE_TYPES: Record<string, string[]> = {
  buy: ["sale"],
  rent: ["rent", "pg"],
  lease: ["commercial_lease"],
};

function toAbs(amount: number, unit: string): number {
  if (unit === "lakh") return amount * 100_000;
  if (unit === "crore") return amount * 10_000_000;
  return amount; // per_month / per_sqft compared as-is
}

type SP = {
  mode?: string; q?: string; city?: string; propertyType?: string;
  bhk?: string; budgetMin?: string; budgetMax?: string; rera?: string;
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUserPage();
  const sp = await searchParams;
  const mode = sp.mode && MODE_TYPES[sp.mode] ? sp.mode : "buy";

  const where: Prisma.MarketplaceListingWhereInput = {
    moderation: "live",
    status: "active",
    listingType: { in: MODE_TYPES[mode] as never[] },
  };
  if (sp.city) where.city = { contains: sp.city, mode: "insensitive" };
  if (sp.propertyType) where.propertyType = sp.propertyType as never;
  if (sp.bhk) where.bhk = Number(sp.bhk);
  if (sp.rera === "1") where.reraId = { not: null };
  if (sp.q) {
    where.OR = [
      { title: { contains: sp.q, mode: "insensitive" } },
      { locality: { contains: sp.q, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.marketplaceListing.findMany({
    where,
    include: {
      photos: { orderBy: { position: "asc" }, take: 1 },
      bookings: { where: { status: "active" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  const min = sp.budgetMin ? Number(sp.budgetMin) : null;
  const max = sp.budgetMax ? Number(sp.budgetMax) : null;

  const listings = rows
    .map((l) => {
      const bk = l.bookings[0];
      const priceAbs = toAbs(Number(l.priceAmount), l.priceUnit);
      return {
        id: l.id,
        title: l.title,
        priceLabel: formatINR(l.priceAmount.toString(), l.priceUnit),
        priceAbs,
        lat: l.lat,
        lng: l.lng,
        bhk: l.bhk,
        propertyType: l.propertyType,
        listingType: l.listingType,
        locality: l.locality,
        city: l.city,
        photo: l.photos[0]?.url ?? null,
        booking: bk ? { byMyFirm: bk.firmId === user.firmId, daysLeft: daysLeft(bk.expiresAt) } : null,
      };
    })
    .filter((l) => (min == null || l.priceAbs >= min) && (max == null || l.priceAbs <= max));

  const withCoords = listings.filter((l) => l.lat != null && l.lng != null).length;

  // Changing only the query string re-renders this page but does NOT remount the
  // client component, so its useState(filters) would go stale (selected tab stuck,
  // map markers not rebuilt). Keying on the active filters forces a fresh mount
  // on every filter change.
  const filterKey = [mode, sp.q, sp.city, sp.propertyType, sp.bhk, sp.budgetMin, sp.budgetMax, sp.rera]
    .map((v) => v ?? "")
    .join("|");

  return (
    <MapSearch
      key={filterKey}
      listings={listings}
      withCoords={withCoords}
      filters={{
        mode,
        q: sp.q ?? "",
        city: sp.city ?? "",
        propertyType: sp.propertyType ?? "",
        bhk: sp.bhk ?? "",
        budgetMin: sp.budgetMin ?? "",
        budgetMax: sp.budgetMax ?? "",
        rera: sp.rera === "1",
      }}
    />
  );
}
