// Firm analytics aggregations for the dashboard.
import { prisma } from "@/lib/db";
import type { LeadStage } from "@prisma/client";

export type Range = "7d" | "30d" | "90d" | "1yr" | "all";

export function rangeStart(range: Range): Date | null {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  switch (range) {
    case "7d": return new Date(now - 7 * day);
    case "30d": return new Date(now - 30 * day);
    case "90d": return new Date(now - 90 * day);
    case "1yr": return new Date(now - 365 * day);
    case "all": return null;
  }
}

export interface Analytics {
  totals: { leads: number; dealsClosed: number; brokerageClosed: number; conversionPct: number };
  funnel: Array<{ stage: LeadStage; count: number }>;
  bySource: Array<{ source: string; leads: number }>;
  byLocality: Array<{ locality: string; leads: number }>;
  byBroker: Array<{ name: string; leads: number; registered: number; deals: number; earned: number }>;
}

const FUNNEL_STAGES: LeadStage[] = [
  "new", "contacted", "site_visit_scheduled", "visited", "negotiating", "token", "agreement", "registered",
];

export async function getAnalytics(firmId: string, range: Range): Promise<Analytics> {
  const start = rangeStart(range);
  const dateFilter = start ? { gte: start } : undefined;

  const leads = await prisma.lead.findMany({
    where: { firmId, ...(dateFilter ? { createdAt: dateFilter } : {}) },
    include: { assignedTo: { select: { name: true } }, property: { select: { locality: true } } },
  });
  const deals = await prisma.deal.findMany({
    where: { firmId, stage: { in: ["registration", "completed"] }, ...(dateFilter ? { createdAt: dateFilter } : {}) },
    include: { primaryBroker: { select: { name: true } } },
  });

  const totalLeads = leads.length;
  const registered = leads.filter((l) => l.stage === "registered").length;
  const brokerageClosed = deals.reduce((acc, d) => acc + Number(d.totalBrokerage), 0);
  const conversionPct = totalLeads > 0 ? Math.round((registered / totalLeads) * 1000) / 10 : 0;

  const funnel = FUNNEL_STAGES.map((stage) => ({ stage, count: leads.filter((l) => l.stage === stage).length }));

  const sourceMap = new Map<string, number>();
  for (const l of leads) sourceMap.set(l.source, (sourceMap.get(l.source) ?? 0) + 1);
  const bySource = [...sourceMap.entries()].map(([source, n]) => ({ source, leads: n })).sort((a, b) => b.leads - a.leads);

  const locMap = new Map<string, number>();
  for (const l of leads) {
    const loc = l.property?.locality ?? "Unknown";
    locMap.set(loc, (locMap.get(loc) ?? 0) + 1);
  }
  const byLocality = [...locMap.entries()].map(([locality, n]) => ({ locality, leads: n })).sort((a, b) => b.leads - a.leads).slice(0, 20);

  const brokerMap = new Map<string, { name: string; leads: number; registered: number; deals: number; earned: number }>();
  for (const l of leads) {
    const name = l.assignedTo?.name ?? "Unassigned";
    const row = brokerMap.get(name) ?? { name, leads: 0, registered: 0, deals: 0, earned: 0 };
    row.leads += 1;
    if (l.stage === "registered") row.registered += 1;
    brokerMap.set(name, row);
  }
  for (const d of deals) {
    const name = d.primaryBroker?.name ?? "Unassigned";
    const row = brokerMap.get(name) ?? { name, leads: 0, registered: 0, deals: 0, earned: 0 };
    row.deals += 1;
    row.earned += Number(d.totalBrokerage);
    brokerMap.set(name, row);
  }
  const byBroker = [...brokerMap.values()].sort((a, b) => b.leads - a.leads);

  return {
    totals: { leads: totalLeads, dealsClosed: deals.length, brokerageClosed, conversionPct },
    funnel,
    bySource,
    byLocality,
    byBroker,
  };
}
