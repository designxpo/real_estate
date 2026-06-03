import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth";
import { formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-green-500/15 text-green-600",
  draft: "bg-zinc-500/15 text-zinc-500",
  booked: "bg-amber-500/15 text-amber-600",
  inactive: "bg-zinc-500/15 text-zinc-500",
  under_offer: "bg-blue-500/15 text-blue-600",
};

export default async function ManagedListingsPage() {
  const user = await requireUserPage();

  const listings = await prisma.marketplaceListing.findMany({
    where: { managedByFirmId: user.firmId },
    include: {
      photos: { orderBy: { position: "asc" }, take: 1 },
      owner: { select: { name: true, phone: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <Link href="/marketplace" className="hover:text-ink">Marketplace</Link>
            <span>/</span>
            <span className="text-ink">Managed listings</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">Listings you manage</h1>
          <p className="text-sm text-ink-muted">
            Properties you list & manage on behalf of owners. The owner can watch — and edit — the
            same listing from their app, and every change is logged for both of you.
          </p>
        </div>
        <Link
          href="/marketplace/managed/new"
          className="shrink-0 text-sm px-4 py-2 rounded-inner bg-accent text-white"
        >
          + List for an owner
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="text-sm text-ink-faint py-12 text-center border border-dashed border-line rounded-inner">
          You aren’t managing any owner listings yet.
          <br />
          <Link href="/marketplace/managed/new" className="text-accent">Create one</Link> — you’ll
          enter the owner’s name & phone, and they can log into the app with that number to follow along.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {listings.map((l) => (
            <Link
              key={l.id}
              href={`/marketplace/managed/${l.id}`}
              className="block bg-surface-2 border border-line rounded-inner overflow-hidden hover:border-accent/60 transition-colors"
            >
              <div className="h-32 bg-app/40">
                {l.photos[0]?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.photos[0].url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-ink-faint text-xs">
                    No photo
                  </div>
                )}
              </div>
              <div className="p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate">{l.title}</span>
                  <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full ${STATUS_STYLE[l.status] ?? "bg-zinc-500/15 text-zinc-500"}`}>
                    {l.status}
                  </span>
                </div>
                <div className="text-sm text-accent font-medium">
                  {formatINR(l.priceAmount.toString(), l.priceUnit)}
                </div>
                <div className="text-xs text-ink-muted truncate">
                  {[l.bhk ? `${l.bhk} BHK` : null, l.locality, l.city].filter(Boolean).join(" · ")}
                </div>
                <div className="text-xs text-ink-faint truncate pt-1 border-t border-line/60 mt-1">
                  Owner: {l.owner.name} · {l.owner.phone}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
