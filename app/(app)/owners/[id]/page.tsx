import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth";
import { formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Trust-only owner profile for brokers — to validate a listing. NO contact PII
// (phone / PAN / Aadhaar / ID doc are never exposed); just identity + portfolio.
const STATUS_STYLE: Record<string, string> = {
  active: "bg-normal-soft text-normal",
  booked: "bg-high-soft text-high",
  closed: "bg-surface-2 text-ink-muted",
  draft: "bg-surface-2 text-ink-muted",
  inactive: "bg-surface-2 text-ink-muted",
};

export default async function OwnerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUserPage();

  const owner = await prisma.owner.findUnique({
    where: { id },
    select: {
      id: true, name: true, photoUrl: true, city: true, state: true,
      ownershipType: true, kycStatus: true, verifiedAt: true, createdAt: true,
    },
  });
  if (!owner) notFound();

  // Their portfolio (live/closed are linkable; others shown as summary).
  const listings = await prisma.marketplaceListing.findMany({
    where: { ownerId: id, moderation: "live" },
    select: { id: true, title: true, status: true, priceAmount: true, priceUnit: true, bhk: true, locality: true, city: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  // This firm's relationship with the owner (bookings + closed deals).
  const [bookingsByFirm, dealsWithFirm] = await Promise.all([
    prisma.listingBooking.count({ where: { firmId: user.firmId, listing: { ownerId: id } } }),
    prisma.deal.count({ where: { firmId: user.firmId, stage: "completed", marketplaceListing: { ownerId: id } } }),
  ]);

  const kycLabel = owner.verifiedAt ? "✓ Verified" : owner.kycStatus === "submitted" ? "KYC under review" : "KYC pending";
  const kycStyle = owner.verifiedAt ? "bg-normal-soft text-normal" : owner.kycStatus === "submitted" ? "bg-info/15 text-info" : "bg-high-soft text-high";

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <Link href="/marketplace" className="hover:text-ink">Marketplace</Link>
        <span>›</span>
        <span className="text-ink">Owner</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-accent-soft overflow-hidden flex items-center justify-center shrink-0">
          {owner.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={owner.photoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-accent text-xl font-semibold">{owner.name.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{owner.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2.5 py-1 rounded-full ${kycStyle}`}>{kycLabel}</span>
            {(owner.city || owner.state) && (
              <span className="text-sm text-ink-muted">{[owner.city, owner.state].filter(Boolean).join(", ")}</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Listings" value={String(listings.length)} />
        <Stat label="Ownership" value={owner.ownershipType ? owner.ownershipType.replace(/_/g, " ") : "—"} />
        <Stat label="Your bookings" value={String(bookingsByFirm)} />
        <Stat label="Closed with you" value={String(dealsWithFirm)} />
      </div>
      <div className="text-xs text-ink-faint">
        Member since {new Date(owner.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })} ·
        Contact stays on-platform (chat) — phone &amp; KYC documents are never shared.
      </div>

      <section>
        <h2 className="text-lg font-semibold text-ink mb-3">Listing portfolio</h2>
        {listings.length === 0 ? (
          <div className="text-sm text-ink-faint border border-dashed border-line rounded-inner py-8 text-center">
            No live listings from this owner.
          </div>
        ) : (
          <div className="space-y-2">
            {listings.map((l) => (
              <Link
                key={l.id}
                href={`/listings/${l.id}`}
                className="flex items-center justify-between gap-3 rounded-inner border border-line bg-surface p-3 hover:border-accent/60 transition-colors"
              >
                <div className="min-w-0">
                  <div className="font-medium text-ink text-sm truncate">{l.title}</div>
                  <div className="text-xs text-ink-muted truncate">
                    {[l.bhk ? `${l.bhk} BHK` : null, l.locality, l.city].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm text-accent font-medium tabular-nums">{formatINR(l.priceAmount.toString(), l.priceUnit)}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${STATUS_STYLE[l.status] ?? "bg-surface-2 text-ink-muted"}`}>{l.status}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-inner border border-line bg-surface p-3">
      <div className="text-xs text-ink-muted">{label}</div>
      <div className="text-lg font-semibold text-ink capitalize tabular-nums">{value}</div>
    </div>
  );
}
