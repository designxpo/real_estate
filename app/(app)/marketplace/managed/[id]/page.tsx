import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth";
import { serializeListing } from "@/lib/owner-listing";
import { serializeActivity } from "@/lib/listing-activity";
import { ManagedListingEditor } from "@/components/managed-listing-editor";

export const dynamic = "force-dynamic";

export default async function ManagedListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUserPage();

  const listing = await prisma.marketplaceListing.findUnique({
    where: { id },
    include: {
      photos: true,
      owner: { select: { name: true, phone: true } },
      managedByFirm: { select: { id: true, name: true } },
      managedByUser: { select: { id: true, name: true } },
    },
  });
  if (!listing || listing.managedByFirmId !== user.firmId) notFound();

  const activity = await prisma.listingActivityLog.findMany({
    where: { listingId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const initial = {
    ...serializeListing(listing),
    activity: activity.map(serializeActivity).map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <Link href="/marketplace/managed" className="hover:text-ink">Managed listings</Link>
        <span>/</span>
        <span className="text-ink truncate max-w-[40ch]">{listing.title}</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{listing.title}</h1>
        <p className="text-sm text-ink-muted">
          Owner: <span className="text-ink">{listing.owner.name}</span> · {listing.owner.phone}
          {" — "}they can log into the owner app with this number to watch & edit this listing.
        </p>
      </div>

      <ManagedListingEditor initial={initial} />
    </div>
  );
}
