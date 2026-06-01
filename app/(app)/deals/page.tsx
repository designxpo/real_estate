import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth";
import { dealVisibility } from "@/lib/scope";
import { DEAL_STAGE_LABELS, DEAL_STAGE_COLORS, DEAL_STAGE_ORDER } from "@/lib/deals";
import type { DealStage } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const user = await requireUserPage();
  const deals = await prisma.deal.findMany({
    where: dealVisibility(user),
    include: { property: { select: { title: true } }, buyer: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const totalPipeline = deals
    .filter((d) => d.stage !== "cancelled")
    .reduce((acc, d) => acc + Number(d.totalBrokerage), 0);

  const stages: DealStage[] = [...DEAL_STAGE_ORDER, "cancelled"];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Deals</h1>
        <Link href="/deals/new" className="text-sm px-3 py-1.5 rounded-inner bg-accent text-white">+ New deal</Link>
      </div>
      <div className="text-sm text-ink-muted">
        Pipeline brokerage: <span className="text-ink font-semibold">₹{totalPipeline.toLocaleString("en-IN")}</span>
      </div>
      {stages.map((stage) => {
        const group = deals.filter((d) => d.stage === stage);
        if (group.length === 0) return null;
        return (
          <div key={stage}>
            <div className={`inline-block text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full mb-2 ${DEAL_STAGE_COLORS[stage]}`}>
              {DEAL_STAGE_LABELS[stage]} ({group.length})
            </div>
            <div className="space-y-2">
              {group.map((d) => (
                <Link key={d.id} href={`/deals/${d.id}`} className="block bg-surface border border-line rounded-inner p-3 hover:bg-hover">
                  <div className="flex justify-between">
                    <div className="text-sm font-medium text-ink">{d.property.title}</div>
                    <div className="text-sm text-ink">₹{Number(d.totalBrokerage).toLocaleString("en-IN")}</div>
                  </div>
                  <div className="text-xs text-ink-muted">{d.buyer.name} · {d.dealType}</div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
      {deals.length === 0 && <div className="text-sm text-ink-faint">No deals yet.</div>}
    </div>
  );
}
