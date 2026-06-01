import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth";
import { leadVisibility } from "@/lib/scope";
import { LeadBoard, type LeadCardData } from "@/components/lead-board";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const user = await requireUserPage();
  const leads = await prisma.lead.findMany({
    where: leadVisibility(user),
    include: {
      contact: { select: { name: true } },
      property: { select: { title: true } },
      assignedTo: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const cards: LeadCardData[] = leads.map((l) => ({
    id: l.id,
    contactName: l.contact.name,
    propertyTitle: l.property?.title ?? null,
    stage: l.stage,
    assignedToName: l.assignedTo?.name ?? null,
    nextFollowupAt: l.nextFollowupAt ? l.nextFollowupAt.toISOString() : null,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <Link href="/leads/new" className="text-sm px-3 py-1.5 rounded-inner bg-accent text-white">
          + New lead
        </Link>
      </div>
      <LeadBoard leads={cards} />
    </div>
  );
}
