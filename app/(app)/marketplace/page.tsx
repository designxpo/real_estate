import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth";
import { formatINR } from "@/lib/utils";
import { MarketplaceCard } from "@/components/marketplace-card";
import { MarketplaceLive } from "@/components/marketplace-live";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; listingType?: string; q?: string }>;
}) {
  const user = await requireUserPage();
  const sp = await searchParams;

  const where: Prisma.MarketplaceListingWhereInput = { moderation: "live", status: "active" };
  if (sp.city) where.city = { contains: sp.city, mode: "insensitive" };
  if (sp.listingType) where.listingType = sp.listingType as never;
  if (sp.q) {
    where.OR = [
      { title: { contains: sp.q, mode: "insensitive" } },
      { locality: { contains: sp.q, mode: "insensitive" } },
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

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Marketplace</h1>
          <div className="flex items-center gap-3">
            <Link
              href="/marketplace/managed"
              className="text-sm px-3 py-1.5 rounded-inner border border-line text-ink-muted hover:text-ink hover:border-accent/60"
            >
              Manage for an owner →
            </Link>
            <MarketplaceLive />
          </div>
        </div>
        <p className="text-sm text-ink-muted">Owner-listed properties. Unlock to get the owner’s contact.</p>
      </div>

      <form className="flex flex-wrap gap-2" method="get">
        <input name="q" defaultValue={sp.q} placeholder="Search title / locality"
          className="bg-surface-2 border border-line rounded-inner px-3 py-2 text-sm text-ink flex-1 min-w-[160px]" />
        <input name="city" defaultValue={sp.city} placeholder="City"
          className="bg-surface-2 border border-line rounded-inner px-3 py-2 text-sm text-ink w-32" />
        <select name="listingType" defaultValue={sp.listingType ?? ""}
          className="bg-surface-2 border border-line rounded-inner px-3 py-2 text-sm text-ink">
          <option value="">Any type</option>
          <option value="sale">Sale</option>
          <option value="rent">Rent</option>
          <option value="pg">PG</option>
          <option value="commercial_lease">Commercial</option>
        </select>
        <button className="text-sm px-4 py-2 rounded-inner bg-accent text-white">Filter</button>
      </form>

      {listings.length === 0 ? (
        <div className="text-sm text-ink-faint py-10 text-center">
          No live owner listings match. (Owners’ listings appear here once activated.)
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {listings.map((l) => (
            <MarketplaceCard
              key={l.id}
              id={l.id}
              title={l.title}
              priceLabel={formatINR(l.priceAmount.toString(), l.priceUnit)}
              meta={[l.bhk ? `${l.bhk} BHK` : null, l.propertyType, l.listingType].filter(Boolean).join(" · ")}
              location={[l.locality, l.city].filter(Boolean).join(", ")}
              photo={l.photos[0]?.url ?? null}
              ownerVerified={!!l.owner.verifiedAt}
              initialUnlocked={l.unlocks.length > 0}
              owner={l.unlocks.length > 0 ? { name: l.owner.name, phone: l.owner.phone } : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
