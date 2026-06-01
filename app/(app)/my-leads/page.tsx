import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LEAD_NEXT } from "@/lib/next-action";
import { STAGE_LABELS, STAGE_COLORS } from "@/lib/leads";

export const dynamic = "force-dynamic";

// Sub-broker (and any user) portal: leads assigned to ME specifically, sorted
// by follow-up urgency. A focused "today's work" view distinct from the
// firm-wide /leads board.
export default async function MyLeadsPage() {
  const user = await requireUserPage();

  const leads = await prisma.lead.findMany({
    where: { firmId: user.firmId, assignedToUserId: user.id },
    orderBy: [{ stage: "asc" }, { nextFollowupAt: "asc" }],
    include: {
      contact: { select: { name: true, phone: true } },
      property: { select: { id: true, title: true, locality: true, city: true } },
    },
    take: 500,
  });

  const now = new Date();
  const open = leads.filter((l) => l.stage !== "registered" && l.stage !== "lost");
  const overdue = open.filter((l) => l.nextFollowupAt && l.nextFollowupAt < now);
  const won = leads.filter((l) => l.stage === "registered");
  const activeProperties = new Set(open.map((l) => l.property?.id).filter(Boolean)).size;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Leads</h1>
          <p className="text-sm text-ink-muted">Everything assigned to you, most urgent first.</p>
        </div>
        <Link href="/leads/new">
          <Button>+ New lead</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Open leads" value={open.length} tone="blue" />
        <Stat label="Overdue" value={overdue.length} tone={overdue.length ? "red" : "neutral"} />
        <Stat label="Properties" value={activeProperties} tone="neutral" />
        <Stat label="Closed (won)" value={won.length} tone="green" />
      </div>

      {open.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="No open leads assigned to you"
          description="New leads assigned to you — from the inbound webhook, public 'Request a Visit', or your principal — will appear here."
          primaryAction={{ label: "+ Add a lead", href: "/leads/new" }}
        />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="divide-y divide-line">
            {open.map((l) => {
              const next = LEAD_NEXT[l.stage];
              const isOverdue = l.nextFollowupAt && l.nextFollowupAt < now;
              return (
                <Link
                  key={l.id}
                  href={`/leads/${l.id}`}
                  className="flex items-center justify-between gap-3 p-4 hover:bg-hover transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-ink truncate flex items-center gap-2">
                      {l.contact.name}
                      {isOverdue && <Pill tone="red" size="xs">overdue</Pill>}
                    </div>
                    <div className="text-xs text-ink-muted truncate">
                      <a href={`tel:${l.contact.phone}`} className="hover:text-accent">{l.contact.phone}</a>
                      {l.property ? ` · ${l.property.title}` : ""}
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${STAGE_COLORS[l.stage]}`}>
                      {STAGE_LABELS[l.stage]}
                    </span>
                    {next ? (
                      <Pill tone={next.tone} size="xs">{next.label}</Pill>
                    ) : l.nextFollowupAt ? (
                      <span className="text-[10px] text-ink-faint">
                        {new Date(l.nextFollowupAt).toLocaleDateString()}
                      </span>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      {won.length > 0 && (
        <div className="text-xs text-ink-faint">
          + {won.length} closed lead{won.length === 1 ? "" : "s"} not shown.
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "blue" | "amber" | "green" | "red";
}) {
  const colors = {
    neutral: "text-ink",
    blue: "text-accent",
    amber: "text-warn",
    green: "text-positive",
    red: "text-negative",
  };
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <div className="text-xs text-ink-muted">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${colors[tone]} tabular-nums`}>{value}</div>
    </div>
  );
}
