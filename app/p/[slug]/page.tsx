import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/utils";
import { siteUrl, citySlug } from "@/lib/site";
import { RequestVisitForm } from "@/components/request-visit-form";

export const dynamic = "force-dynamic";

async function getProperty(slug: string) {
  const property = await prisma.property.findUnique({
    where: { publicSlug: slug },
    include: {
      photos: { orderBy: { position: "asc" } },
      listedBy: { select: { name: true, phone: true } },
    },
  });
  if (!property || !property.publicEnabled) return null;
  return property;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const property = await getProperty(slug);
  if (!property) return { title: "Listing not found" };
  const desc = `${property.bhk ? property.bhk + " BHK " : ""}${property.propertyType} · ${formatINR(property.priceAmount.toString(), property.priceUnit)} · ${[property.locality, property.city].filter(Boolean).join(", ")}`;
  return {
    title: property.title,
    description: desc,
    alternates: { canonical: `${siteUrl}/p/${slug}` },
    openGraph: {
      title: property.title,
      description: desc,
      url: `${siteUrl}/p/${slug}`,
      images: property.photos[0]?.url ? [property.photos[0].url] : [],
    },
  };
}

export default async function PublicPropertyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const property = await getProperty(slug);
  if (!property) notFound();

  const facts: Array<[string, string]> = [];
  if (property.bhk) facts.push(["BHK", String(property.bhk)]);
  if (property.carpetSqft) facts.push(["Carpet", `${property.carpetSqft} sqft`]);
  if (property.furnishing) facts.push(["Furnishing", property.furnishing]);
  if (property.facing) facts.push(["Facing", property.facing]);
  if (property.floor != null) facts.push(["Floor", `${property.floor}/${property.totalFloors ?? "?"}`]);

  // Breadcrumb trail: Home › City (hub) › Property. Pushes link equity up to the
  // city hub and renders BreadcrumbList structured data for rich results.
  const cityHref = `/explore/${citySlug(property.city)}`;
  const crumbs = [
    { name: "Home", url: siteUrl + "/" },
    { name: property.city, url: `${siteUrl}${cityHref}` },
    { name: property.title, url: `${siteUrl}/p/${slug}` },
  ];
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
  const listingLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: property.title,
    description: property.description ?? undefined,
    image: property.photos.map((p) => p.url),
    category: property.propertyType,
    offers: {
      "@type": "Offer",
      price: property.priceAmount.toString(),
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      url: `${siteUrl}/p/${slug}`,
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listingLd) }} />
      <div className="max-w-lg mx-auto bg-white min-h-screen">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-gray-500 px-4 py-3 flex-wrap">
          <Link href="/" className="hover:text-gray-900">Home</Link>
          <span>›</span>
          <Link href={cityHref} className="hover:text-gray-900">{property.city}</Link>
          <span>›</span>
          <span className="text-gray-700 truncate max-w-[60%]">{property.title}</span>
        </nav>
        {property.photos[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={property.photos[0].url} alt={property.title} className="w-full aspect-video object-cover" />
        )}
        <div className="p-4 space-y-4">
          <div>
            <h1 className="text-xl font-bold">{property.title}</h1>
            <div className="text-gray-500 text-sm">{[property.locality, property.city, property.state].filter(Boolean).join(", ")}</div>
            <div className="text-2xl font-bold text-blue-600 mt-2">
              {formatINR(property.priceAmount.toString(), property.priceUnit)}
              {property.negotiable && <span className="text-sm font-normal text-gray-400"> · negotiable</span>}
            </div>
          </div>

          {facts.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {facts.map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded-lg p-2 text-center">
                  <div className="text-[11px] uppercase text-gray-400">{k}</div>
                  <div className="text-sm font-medium capitalize">{v}</div>
                </div>
              ))}
            </div>
          )}

          {property.description && <p className="text-sm text-gray-700 whitespace-pre-wrap">{property.description}</p>}

          {property.amenities.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {property.amenities.map((a) => (
                <span key={a} className="text-xs bg-gray-100 rounded-full px-2 py-1">{a}</span>
              ))}
            </div>
          )}

          <div className="border-t pt-4">
            <div className="text-sm text-gray-500 mb-1">Listed by {property.listedBy.name}</div>
            <a href={`tel:${property.listedBy.phone}`} className="block w-full text-center bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium mb-3">
              Call {property.listedBy.phone}
            </a>
            <RequestVisitForm slug={slug} />
          </div>
        </div>
      </div>
    </div>
  );
}
