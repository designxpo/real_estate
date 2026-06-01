import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth";
import { propertyVisibility } from "@/lib/scope";
import { formatINR } from "@/lib/utils";
import { buildShareText } from "@/lib/share";
import { ShareCard } from "@/components/share-card";
import { ALL_PORTALS, getAdapter } from "@/lib/portals";
import { SyndicationPanel } from "@/components/syndication-panel";
import { LandlordActivationPanel } from "@/components/landlord-activation-panel";

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
      listingTargets: true,
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

  return (
    <div className="space-y-6">
      <div>
        <Link href="/properties" className="text-sm text-ink-muted hover:text-ink">
          ← Properties
        </Link>
        <h1 className="text-2xl font-semibold mt-1">{property.title}</h1>
        <div className="text-ink-muted">
          {[property.locality, property.city, property.state].filter(Boolean).join(", ")}
        </div>
      </div>

      {property.photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {property.photos.map((ph) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={ph.id}
              src={ph.url}
              alt={ph.caption ?? property.title}
              className="aspect-square object-cover rounded-md bg-fill"
            />
          ))}
        </div>
      )}

      <div className="bg-surface rounded-lg border border-line p-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        <Info label="Price" value={formatINR(property.priceAmount.toString(), property.priceUnit)} />
        <Info label="Listing" value={property.listingType} />
        <Info label="Type" value={property.propertyType} />
        <Info label="BHK" value={property.bhk ?? "—"} />
        <Info label="Carpet" value={property.carpetSqft ? `${property.carpetSqft} sqft` : "—"} />
        <Info label="Furnishing" value={property.furnishing ?? "—"} />
        <Info label="Floor" value={property.floor != null ? `${property.floor}/${property.totalFloors ?? "?"}` : "—"} />
        <Info label="Facing" value={property.facing ?? "—"} />
        <Info label="Status" value={property.status} />
      </div>

      <LandlordActivationPanel
        propertyId={property.id}
        status={property.status}
        landlord={property.landlord ? { name: property.landlord.name, phone: property.landlord.phone } : null}
      />

      <ShareCard shareText={shareText} publicUrl={publicUrl} />

      <SyndicationPanel
        propertyId={property.id}
        checks={ALL_PORTALS.map((p) => {
          const adapter = getAdapter(p.id);
          const v = adapter
            ? adapter.validate(property)
            : { ok: false, warnings: [], errors: ["No adapter"] };
          return { portal: p.id, displayName: p.displayName, validation: v };
        })}
        initialTargets={property.listingTargets.map((t) => ({
          portal: t.portal,
          status: t.status,
          lastRefreshedAt: t.lastRefreshedAt ? t.lastRefreshedAt.toISOString() : null,
          nextRefreshAt: t.nextRefreshAt ? t.nextRefreshAt.toISOString() : null,
          refreshCount: t.refreshCount,
          refreshIntervalDays: t.refreshIntervalDays,
        }))}
      />

      {property.description && (
        <div className="bg-surface rounded-lg border border-line p-4">
          <h2 className="text-sm font-medium text-ink-muted mb-2">Description</h2>
          <p className="whitespace-pre-wrap text-sm">{property.description}</p>
        </div>
      )}

      {property.amenities.length > 0 && (
        <div className="bg-surface rounded-lg border border-line p-4">
          <h2 className="text-sm font-medium text-ink-muted mb-2">Amenities</h2>
          <div className="flex flex-wrap gap-2">
            {property.amenities.map((a) => (
              <span key={a} className="text-xs bg-fill text-ink rounded-full px-2 py-1">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-surface rounded-lg border border-line p-4 text-sm space-y-1">
        <div><span className="text-ink-muted">Listed by: </span>{property.listedBy.name}</div>
        {property.ownerContact && (
          <div>
            <span className="text-ink-muted">Owner: </span>
            {property.ownerContact.name} ({property.ownerContact.phone})
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="font-medium capitalize">{value}</div>
    </div>
  );
}
