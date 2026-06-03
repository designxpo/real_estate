import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth";
import { propertyVisibility } from "@/lib/scope";
import { formatINR } from "@/lib/utils";
import { buildShareText } from "@/lib/share";
import { ShareCard } from "@/components/share-card";
import { LandlordActivationPanel } from "@/components/landlord-activation-panel";
import { PropertyDetail, type PropertyView } from "@/components/property-detail";
import { CopyButton } from "@/components/copy-button";

export const dynamic = "force-dynamic";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUserPage();
  const property = await prisma.property.findFirst({
    where: { id, ...propertyVisibility(user) },
    include: {
      photos: { orderBy: { position: "asc" } },
      listedBy: { select: { name: true, phone: true } },
      ownerContact: { select: { name: true, phone: true } },
      landlord: { select: { name: true, phone: true } },
      firm: true,
    },
  });
  if (!property) notFound();

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = `${proto}://${host}`;
  const publicUrl = property.publicSlug ? `${baseUrl}/p/${property.publicSlug}` : null;

  const shareText = buildShareText(
    {
      title: property.title,
      bhk: property.bhk,
      propertyType: property.propertyType,
      listingType: property.listingType,
      priceAmount: property.priceAmount.toString(),
      priceUnit: property.priceUnit,
      negotiable: property.negotiable,
      locality: property.locality,
      city: property.city,
      carpetSqft: property.carpetSqft,
      floor: property.floor,
      totalFloors: property.totalFloors,
      furnishing: property.furnishing,
      facing: property.facing,
      ageYears: property.ageYears,
      amenities: property.amenities,
      publicSlug: property.publicSlug,
      brokerName: property.listedBy.name,
      brokerPhone: property.listedBy.phone,
    },
    baseUrl
  );

  const specs: { label: string; value: string }[] = [];
  if (property.bhk) specs.push({ label: "Config", value: `${property.bhk} BHK` });
  specs.push({ label: "Type", value: property.propertyType });
  specs.push({ label: "Listing", value: property.listingType });
  if (property.carpetSqft) specs.push({ label: "Carpet area", value: `${property.carpetSqft.toLocaleString("en-IN")} sqft` });
  if (property.floor != null) specs.push({ label: "Floor", value: `${property.floor}/${property.totalFloors ?? "?"}` });
  if (property.facing) specs.push({ label: "Facing", value: property.facing });
  if (property.furnishing) specs.push({ label: "Furnishing", value: property.furnishing });

  const availability: { label: string; value: string }[] = [];
  if (property.availableFrom) availability.push({ label: "Available from", value: new Date(property.availableFrom).toLocaleDateString("en-IN") });
  if (property.ageYears != null) availability.push({ label: "Age", value: `${property.ageYears} yrs` });

  const view: PropertyView = {
    kind: "property",
    title: property.title,
    breadcrumb: { city: property.city, locality: property.locality },
    statusLabel: property.status,
    statusTone: "muted",
    photos: property.photos.map((p) => p.url),
    description: property.description,
    specs,
    availability,
    amenities: property.amenities,
    rera: property.reraId ? { id: property.reraId } : null,
  };

  return (
    <PropertyDetail
      view={view}
      headerActions={publicUrl ? <CopyButton text={publicUrl} label="Share link" /> : undefined}
      aside={
        <div className="space-y-4">
          <div className="rounded-lg border border-line bg-surface shadow-card p-5">
            <div className="text-2xl font-semibold text-ink tabular-nums">
              {formatINR(property.priceAmount.toString(), property.priceUnit)}
            </div>
            {property.negotiable && <div className="text-sm text-ink-muted">Negotiable</div>}
            <div className="mt-3 text-sm text-ink-soft border-t border-line pt-3">
              <span className="text-ink-muted">Listed by </span>{property.listedBy.name}
              {property.ownerContact && (
                <div className="text-ink-muted mt-1">Owner: {property.ownerContact.name} · {property.ownerContact.phone}</div>
              )}
            </div>
          </div>
          <LandlordActivationPanel
            propertyId={property.id}
            status={property.status}
            landlord={property.landlord ? { name: property.landlord.name, phone: property.landlord.phone } : null}
          />
          <ShareCard shareText={shareText} publicUrl={publicUrl} />
        </div>
      }
    />
  );
}
