import Link from "next/link";
import type { PublicListing } from "@/lib/public-listings";

// Public, link-only listing card (no booking/CRM logic). Used on the homepage,
// /explore, and city hubs — every card links to the indexable /p/[slug] page.
export function PublicListingCard({ listing }: { listing: PublicListing }) {
  const meta = [listing.bhk ? `${listing.bhk} BHK` : null, listing.locality, listing.city]
    .filter(Boolean)
    .join(" · ");
  return (
    <Link
      href={`/p/${listing.slug}`}
      className="group block rounded-card border border-line bg-surface overflow-hidden shadow-card transition-colors hover:border-accent"
    >
      <div className="aspect-[4/3] bg-surface-2">
        {listing.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.photo} alt={listing.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-faint text-xs">No photo</div>
        )}
      </div>
      <div className="p-3">
        <div className="text-accent font-semibold tabular-nums">{listing.priceLabel}</div>
        <div className="text-sm text-ink truncate">{listing.title}</div>
        <div className="text-xs text-ink-muted truncate">{meta}</div>
      </div>
    </Link>
  );
}
