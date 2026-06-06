import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getPublicListings, getPublicCities } from "@/lib/public-listings";
import { citySlug, siteUrl } from "@/lib/site";
import { PublicHeader } from "@/components/public/public-header";
import { PublicListingCard } from "@/components/public/listing-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Find your next home — verified listings across India",
  description:
    "Browse verified residential and commercial property listings across India. Apartments, villas, plots, offices and shops — direct from RERA-registered brokers.",
  alternates: { canonical: siteUrl + "/" },
};

export default async function Home() {
  // Public, crawlable landing — NO auth redirect (preserves link equity). Signed-in
  // brokers simply see a "Dashboard" CTA instead of "Login".
  const [user, featured, cities] = await Promise.all([
    getCurrentUser().catch(() => null),
    getPublicListings({ take: 8 }),
    getPublicCities(),
  ]);

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: "Keya",
    url: siteUrl,
    areaServed: cities.map((c) => c.city),
  };

  return (
    <div className="min-h-screen bg-app">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
      <PublicHeader signedIn={!!user} />

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 pt-10 pb-12 text-center">
        <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-ink">
          Find your next home, the trusted way
        </h1>
        <p className="mt-4 text-ink-muted max-w-2xl mx-auto">
          Verified listings across India — apartments, villas, plots, offices and shops, direct from
          RERA-registered brokers.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/explore" className="px-5 py-2.5 rounded-full bg-accent text-white text-sm font-medium">
            Browse listings
          </Link>
          {cities[0] && (
            <Link href={`/explore/${citySlug(cities[0].city)}`} className="px-5 py-2.5 rounded-full border border-line text-ink text-sm">
              Homes in {cities[0].city}
            </Link>
          )}
        </div>
      </section>

      {/* Featured listings */}
      {featured.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 md:px-6 pb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl font-semibold text-ink">Featured listings</h2>
            <Link href="/explore" className="text-sm text-accent hover:underline">View all →</Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {featured.map((l) => <PublicListingCard key={l.slug} listing={l} />)}
          </div>
        </section>
      )}

      {/* City hubs */}
      {cities.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 md:px-6 pb-16">
          <h2 className="font-display text-2xl font-semibold text-ink mb-4">Explore by city</h2>
          <div className="flex flex-wrap gap-2">
            {cities.map((c) => (
              <Link
                key={c.city}
                href={`/explore/${citySlug(c.city)}`}
                className="px-4 py-2 rounded-full border border-line bg-surface text-sm text-ink hover:border-accent"
              >
                {c.city} <span className="text-ink-faint">· {c.count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-line">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-ink-muted">
          <span>© {new Date().getFullYear()} Keya</span>
          <div className="flex items-center gap-4">
            <Link href="/explore" className="hover:text-ink">Explore</Link>
            <Link href="/login" className="hover:text-ink">Broker login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
