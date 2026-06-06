import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getPublicListings, getPublicCities } from "@/lib/public-listings";
import { citySlug, siteUrl } from "@/lib/site";
import { PublicHeader } from "@/components/public/public-header";
import { PublicListingCard } from "@/components/public/listing-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explore properties across India",
  description: "Browse all verified property listings — filter by city, type and budget.",
  alternates: { canonical: `${siteUrl}/explore` },
};

export default async function ExplorePage() {
  const [user, listings, cities] = await Promise.all([
    getCurrentUser().catch(() => null),
    getPublicListings({ take: 48 }),
    getPublicCities(),
  ]);

  return (
    <div className="min-h-screen bg-app">
      <PublicHeader signedIn={!!user} />
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-ink-muted">
          <Link href="/" className="hover:text-ink">Home</Link>
          <span>›</span>
          <span className="text-ink">Explore</span>
        </nav>

        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Explore properties</h1>
          <p className="text-sm text-ink-muted">{listings.length} listing{listings.length === 1 ? "" : "s"} across {cities.length} cit{cities.length === 1 ? "y" : "ies"}.</p>
        </div>

        {cities.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {cities.map((c) => (
              <Link key={c.city} href={`/explore/${citySlug(c.city)}`} className="px-4 py-2 rounded-full border border-line bg-surface text-sm text-ink hover:border-accent">
                {c.city} <span className="text-ink-faint">· {c.count}</span>
              </Link>
            ))}
          </div>
        )}

        {listings.length === 0 ? (
          <p className="text-sm text-ink-faint">No public listings yet.</p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {listings.map((l) => <PublicListingCard key={l.slug} listing={l} />)}
          </div>
        )}
      </main>
    </div>
  );
}
