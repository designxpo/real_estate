import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth";
import { contactVisibility, propertyVisibility } from "@/lib/scope";
import { NewLeadForm } from "@/components/new-lead-form";

export const dynamic = "force-dynamic";

export default async function NewLeadPage({
  searchParams,
}: {
  searchParams: Promise<{ marketplaceListingId?: string }>;
}) {
  const user = await requireUserPage();
  const { marketplaceListingId } = await searchParams;
  const [contacts, properties] = await Promise.all([
    prisma.contact.findMany({
      where: contactVisibility(user),
      select: { id: true, name: true, phone: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.property.findMany({
      where: propertyVisibility(user),
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  return (
    <div className="space-y-4 max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight">New lead</h1>
      {marketplaceListingId && (
        <p className="text-sm text-ink-muted">
          Linked to a marketplace listing — advancing this lead updates the owner’s live progress.
        </p>
      )}
      <NewLeadForm
        contacts={contacts.map((c) => ({ id: c.id, label: `${c.name} · ${c.phone}` }))}
        properties={properties.map((p) => ({ id: p.id, label: p.title }))}
        marketplaceListingId={marketplaceListingId}
      />
    </div>
  );
}
