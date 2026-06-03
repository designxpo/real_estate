import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth";
import { leadVisibility } from "@/lib/scope";
import { STAGE_LABELS, STAGE_COLORS } from "@/lib/leads";
import { LeadActions } from "@/components/lead-actions";

export const dynamic = "force-dynamic";

const CONVERTIBLE = ["negotiating", "token", "agreement", "registered"];

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUserPage();
  const lead = await prisma.lead.findFirst({
    where: { id, ...leadVisibility(user) },
    include: {
      contact: true,
      property: { select: { id: true, title: true } },
      marketplaceListing: { select: { id: true, title: true } },
      assignedTo: { select: { name: true } },
      siteVisits: { orderBy: { scheduledAt: "desc" } },
    },
  });
  if (!lead) notFound();

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <Link href="/leads" className="text-sm text-ink-muted hover:text-ink">← Leads</Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-2xl font-semibold">{lead.contact.name}</h1>
          <span className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${STAGE_COLORS[lead.stage]}`}>
            {STAGE_LABELS[lead.stage]}
          </span>
        </div>
        <div className="text-ink-muted text-sm">{lead.contact.phone}</div>
      </div>

      <div className="bg-surface border border-line rounded-lg p-4 text-sm space-y-1">
        {lead.property && (
          <div><span className="text-ink-muted">Property: </span>
            <Link href={`/properties/${lead.property.id}`} className="text-accent">{lead.property.title}</Link>
          </div>
        )}
        {lead.marketplaceListing && (
          <div><span className="text-ink-muted">Marketplace listing: </span>
            <Link href={`/listings/${lead.marketplaceListing.id}`} className="text-accent">{lead.marketplaceListing.title}</Link>
          </div>
        )}
        {lead.intent && <div><span className="text-ink-muted">Intent: </span>{lead.intent}</div>}
        {lead.assignedTo && <div><span className="text-ink-muted">Assigned: </span>{lead.assignedTo.name}</div>}
        {lead.requirementsText && <div><span className="text-ink-muted">Requirements: </span>{lead.requirementsText}</div>}
        {lead.nextFollowupAt && <div><span className="text-ink-muted">Next follow-up: </span>{lead.nextFollowupAt.toLocaleString("en-IN")}</div>}
        {lead.lostReason && <div className="text-red-400">Lost: {lead.lostReason}</div>}
      </div>

      <LeadActions leadId={lead.id} stage={lead.stage} />

      {CONVERTIBLE.includes(lead.stage) && !lead.marketplaceListingId && (
        <Link href={`/deals/new?leadId=${lead.id}`} className="inline-block text-sm px-3 py-1.5 rounded-inner border border-accent text-accent hover:bg-accent-soft">
          Convert to deal →
        </Link>
      )}
      {lead.marketplaceListingId && (
        <div className="text-xs text-ink-muted">
          This lead came from the marketplace — a deal is created automatically when the broker marks the booking <span className="text-ink">sold</span>.
        </div>
      )}

      <div className="bg-surface border border-line rounded-lg p-4">
        <h2 className="text-sm font-medium text-ink-muted mb-2">Site visits</h2>
        {lead.siteVisits.length === 0 ? (
          <div className="text-sm text-ink-faint">No site visits yet.</div>
        ) : (
          <ul className="space-y-1 text-sm">
            {lead.siteVisits.map((v) => (
              <li key={v.id} className="flex justify-between">
                <span>{v.scheduledAt.toLocaleString("en-IN")}</span>
                <span className="text-ink-muted">{v.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
