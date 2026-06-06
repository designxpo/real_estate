import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getPublicListings } from "@/lib/public-listings";
import { citySlug, siteUrl } from "@/lib/site";
import { PublicHeader } from "@/components/public/public-header";
import { PublicListingCard } from "@/components/public/listing-card";

export const dynamic = "force-dynamic";

// Resolve a city slug back to the exact stored city name (case/space-insensitive).
async function resolveCity(slug: string): Promise<string | null> {
  const groups = await prisma.property.groupBy({
    by: ["city"],
    where: { publicEnabled: true, publicSlug: { not: null } },
  });
  return groups.find((g) => citySlug(g.city) === slug)?.city ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params;
  const name = await resolveCity(city);
  if (!name) return { title: "City not found" };
  return {
    title: `Property for sale & rent in ${name}`,
    description: `Verified apartments, villas, plots and commercial property in ${name}, direct from RERA-registered brokers.`,
    alternates: { canonical: `${siteUrl}/explore/${city}` },
  };
}

export default async function CityHubPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const name = await resolveCity(city);
  if (!name) notFound();

  const [user, listings] = await Promise.all([
    getCurrentUser().catch(() => null),
    getPublicListings({ city: name, take: 60 }),
  ]);

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl + "/" },
      { "@type": "ListItem", position: 2, name: name, item: `${siteUrl}/explore/${city}` },
    ],
  };

  return (
    <div className="min-h-screen bg-app">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <PublicHeader signedIn={!!user} />
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-ink-muted">
          <Link href="/" className="hover:text-ink">Home</Link>
          <span>›</span>
          <Link href="/explore" className="hover:text-ink">Explore</Link>
          <span>›</span>
          <span className="text-ink">{name}</span>
        </nav>

        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Property in {name}</h1>
          <p className="text-sm text-ink-muted">{listings.length} verified listing{listings.length === 1 ? "" : "s"}.</p>
        </div>

        {listings.length === 0 ? (
          <p className="text-sm text-ink-faint">No public listings in {name} right now.</p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {listings.map((l) => <PublicListingCard key={l.slug} listing={l} />)}
          </div>
        )}
      </main>
    </div>
  );
}
