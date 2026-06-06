// Read helpers for the PUBLIC (indexable) marketing surface — homepage, /explore,
// and city hubs. Only exposes properties the broker has opted to publish
// (publicEnabled + a publicSlug). No auth; safe trust-level fields only.
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/utils";

export interface PublicListing {
  slug: string;
  title: string;
  city: string;
  locality: string | null;
  priceLabel: string;
  bhk: number | null;
  propertyType: string;
  listingType: string;
  photo: string | null;
}

const baseWhere = { publicEnabled: true, publicSlug: { not: null } } as const;

function shape(p: {
  publicSlug: string | null; title: string; city: string; locality: string | null;
  priceAmount: { toString(): string }; priceUnit: string; bhk: number | null;
  propertyType: string; listingType: string; photos: { url: string }[];
}): PublicListing {
  return {
    slug: p.publicSlug!,
    title: p.title,
    city: p.city,
    locality: p.locality,
    priceLabel: formatINR(p.priceAmount.toString(), p.priceUnit as never),
    bhk: p.bhk,
    propertyType: p.propertyType,
    listingType: p.listingType,
    photo: p.photos[0]?.url ?? null,
  };
}

export async function getPublicListings(opts: { city?: string; take?: number } = {}): Promise<PublicListing[]> {
  const rows = await prisma.property.findMany({
    where: { ...baseWhere, ...(opts.city ? { city: opts.city } : {}) },
    include: { photos: { orderBy: { position: "asc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
    take: opts.take ?? 24,
  });
  return rows.map(shape);
}

// Distinct public cities with a live count, busiest first.
export async function getPublicCities(): Promise<{ city: string; count: number }[]> {
  const groups = await prisma.property.groupBy({
    by: ["city"],
    where: baseWhere,
    _count: { _all: true },
  });
  return groups
    .map((g) => ({ city: g.city, count: g._count._all }))
    .sort((a, b) => b.count - a.count);
}
