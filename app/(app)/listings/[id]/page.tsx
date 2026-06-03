import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth";
import { formatINR } from "@/lib/utils";
import { releaseExpiredBookings, daysLeft } from "@/lib/booking";
import { PropertyDetail, type PropertyView } from "@/components/property-detail";
import { ListingEnquiryWidget } from "@/components/listing-enquiry-widget";
import { CopyButton } from "@/components/copy-button";

export const dynamic = "force-dynamic";

const LISTING_TYPE_LABEL: Record<string, string> = {
  sale: "For sale", rent: "For rent", pg: "PG / Co-living", commercial_lease: "Commercial lease",
};
const PROP_TYPE_LABEL: Record<string, string> = {
  apartment: "Apartment", villa: "Villa", plot: "Plot / Land", office: "Office", shop: "Shop", warehouse: "Warehouse", other: "Other",
};
const FURNISH_LABEL: Record<string, string> = { unfurnished: "Unfurnished", semi: "Semi-furnished", fully: "Fully furnished" };

export default async function MarketplaceListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUserPage();
  await releaseExpiredBookings();

  const l = await prisma.marketplaceListing.findUnique({
    where: { id },
    include: {
      photos: { orderBy: { position: "asc" } },
      owner: { select: { verifiedAt: true } },
      bookings: { where: { status: "active" }, take: 1 },
    },
  });
  if (!l || l.moderation !== "live") notFound();

  const bk = l.bookings[0];
  // Reserved-by-another-firm listings are hidden from the pool.
  if (l.status === "booked" && bk && bk.firmId !== user.firmId) notFound();

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const publicUrl = l.publicSlug ? `${proto}://${host}/p/${l.publicSlug}` : null;

  const statusMap: Record<string, { label: string; tone: PropertyView["statusTone"] }> = {
    active: { label: "Available", tone: "normal" },
    booked: { label: "Reserved", tone: "high" },
    closed: { label: "Closed", tone: "muted" },
  };
  const st = statusMap[l.status] ?? { label: l.status, tone: "muted" as const };

  const specs: { label: string; value: string }[] = [];
  if (l.bhk) specs.push({ label: "Config", value: `${l.bhk} BHK` });
  specs.push({ label: "Type", value: PROP_TYPE_LABEL[l.propertyType] ?? l.propertyType });
  specs.push({ label: "Listing", value: LISTING_TYPE_LABEL[l.listingType] ?? l.listingType });
  if (l.carpetSqft) specs.push({ label: "Carpet area", value: `${l.carpetSqft.toLocaleString("en-IN")} sqft` });
  if (l.builtupSqft) specs.push({ label: "Built-up", value: `${l.builtupSqft.toLocaleString("en-IN")} sqft` });
  if (l.furnishing) specs.push({ label: "Furnishing", value: FURNISH_LABEL[l.furnishing] ?? l.furnishing });

  const availability: { label: string; value: string }[] = [];
  if (l.availableFrom) availability.push({ label: "Available from", value: new Date(l.availableFrom).toLocaleDateString("en-IN") });
  if (l.depositMonths) availability.push({ label: "Deposit", value: `${l.depositMonths} months` });
  if (l.maintenanceAmount) availability.push({ label: "Maintenance", value: `₹${Number(l.maintenanceAmount).toLocaleString("en-IN")}` });

  const view: PropertyView = {
    kind: "marketplace",
    title: l.title,
    breadcrumb: { city: l.city, locality: l.locality },
    statusLabel: st.label,
    statusTone: st.tone,
    photos: l.photos.map((p) => p.url),
    description: l.description,
    specs,
    availability,
    amenities: l.amenities,
    rera: l.reraId ? { id: l.reraId } : null,
  };

  const priceLabel = formatINR(l.priceAmount.toString(), l.priceUnit);
  const priceSecondary =
    l.maintenanceAmount ? `+ ₹${Number(l.maintenanceAmount).toLocaleString("en-IN")} maintenance` : l.negotiable ? "Negotiable" : null;

  return (
    <PropertyDetail
      view={view}
      headerActions={publicUrl ? <CopyButton text={publicUrl} label="Share link" /> : undefined}
      aside={
        <ListingEnquiryWidget
          listingId={l.id}
          title={l.title}
          priceLabel={priceLabel}
          priceSecondary={priceSecondary}
          windowDays={l.bookingWindowDays}
          booking={bk ? { id: bk.id, byMyFirm: bk.firmId === user.firmId, daysLeft: daysLeft(bk.expiresAt) } : null}
          ownerVerified={!!l.owner.verifiedAt}
        />
      }
    />
  );
}
