import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth";
import { propertyVisibility, contactVisibility, leadVisibility } from "@/lib/scope";
import { NewDealForm } from "@/components/new-deal-form";

export const dynamic = "force-dynamic";

export default async function NewDealPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>;
}) {
  const user = await requireUserPage();
  const { leadId } = await searchParams;

  const [properties, contacts] = await Promise.all([
    prisma.property.findMany({ where: propertyVisibility(user), select: { id: true, title: true }, take: 200 }),
    prisma.contact.findMany({ where: contactVisibility(user), select: { id: true, name: true, phone: true }, take: 300 }),
  ]);

  let prefill: { propertyId?: string; buyerContactId?: string; leadId?: string } | undefined;
  if (leadId) {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, ...leadVisibility(user) },
      select: { id: true, propertyId: true, contactId: true },
    });
    if (lead) prefill = { leadId: lead.id, propertyId: lead.propertyId ?? undefined, buyerContactId: lead.contactId };
  }

  return (
    <div className="space-y-4 max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight">New deal</h1>
      <NewDealForm
        properties={properties.map((p) => ({ id: p.id, label: p.title }))}
        contacts={contacts.map((c) => ({ id: c.id, label: `${c.name} · ${c.phone}` }))}
        prefill={prefill}
      />
    </div>
  );
}
