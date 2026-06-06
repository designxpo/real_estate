// Cross-firm business metrics for the platform owner. All queries span ALL firms
// (no tenant scoping) — only ever called from /platform routes behind
// requirePlatformAdmin. Read-only aggregates.
import { prisma } from "@/lib/db";
import { getPlans, type Plan } from "@/lib/plans";

export interface PlatformMetrics {
  firms: { total: number; suspended: number; verified: number; paying: number; free: number };
  mrr: number; // ₹ / month, recurring from active non-free subscriptions
  arr: number; // mrr * 12
  gmv: number; // ₹ total agreed price across completed deals
  brokerageVolume: number; // ₹ total brokerage across completed deals
  totals: { listings: number; activeBookings: number; leads: number; deals: number; owners: number };
  signupSeries: { labels: string[]; counts: number[] }; // last 6 months
  byPlan: { plan: Plan; firms: number; mrr: number }[];
  byState: { label: string; count: number }[];
  byFirmType: { label: string; count: number }[];
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  const plans = await getPlans(true);
  const priceById: Record<string, number> = {};
  for (const p of plans) priceById[p.id] = p.priceMonthly;

  const [
    totalFirms,
    suspendedFirms,
    verifiedFirms,
    planGroups,
    listings,
    activeBookings,
    leads,
    deals,
    owners,
    dealAgg,
    firstOfWindow,
    stateGroups,
    typeGroups,
  ] = await Promise.all([
    prisma.firm.count(),
    prisma.firm.count({ where: { suspendedAt: { not: null } } }),
    prisma.firm.count({ where: { verificationStatus: "verified" } }),
    // Firms grouped by plan, restricted to active subscriptions (drives MRR).
    prisma.firm.groupBy({
      by: ["planId"],
      where: { subscriptionStatus: "active" },
      _count: { _all: true },
    }),
    prisma.marketplaceListing.count(),
    prisma.listingBooking.count({ where: { status: "active" } }),
    prisma.lead.count(),
    prisma.deal.count(),
    prisma.owner.count(),
    prisma.deal.aggregate({
      where: { stage: "completed" },
      _sum: { agreedPrice: true, totalBrokerage: true },
    }),
    // All firm createdAt timestamps in the last 6 months for the signup series.
    prisma.firm.findMany({
      where: { createdAt: { gte: sixMonthsAgo() } },
      select: { createdAt: true },
    }),
    prisma.firm.groupBy({ by: ["state"], _count: { _all: true } }),
    prisma.firm.groupBy({ by: ["firmType"], _count: { _all: true } }),
  ]);

  // MRR + per-plan breakdown from active subscriptions.
  let mrr = 0;
  const planCount: Record<string, number> = {};
  for (const g of planGroups) {
    planCount[g.planId] = g._count._all;
    mrr += (priceById[g.planId] ?? 0) * g._count._all;
  }
  const payingFirms = planGroups
    .filter((g) => (priceById[g.planId] ?? 0) > 0)
    .reduce((a, g) => a + g._count._all, 0);

  const byPlan = plans
    .map((plan) => ({
      plan,
      firms: planCount[plan.id] ?? 0,
      mrr: (priceById[plan.id] ?? 0) * (planCount[plan.id] ?? 0),
    }))
    .filter((row) => row.firms > 0 || plan_isCore(row.plan.id));

  // Signup series — bucket by month over the last 6 months.
  const labels: string[] = [];
  const keys: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(monthKey(d));
    labels.push(d.toLocaleDateString("en-IN", { month: "short" }));
  }
  const bucket: Record<string, number> = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const f of firstOfWindow) {
    const k = monthKey(f.createdAt);
    if (k in bucket) bucket[k] += 1;
  }
  const counts = keys.map((k) => bucket[k]);

  const byState = stateGroups
    .map((g) => ({ label: g.state || "Unknown", count: g._count._all }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const byFirmType = typeGroups
    .map((g) => ({ label: g.firmType || "Unspecified", count: g._count._all }))
    .sort((a, b) => b.count - a.count);

  return {
    firms: {
      total: totalFirms,
      suspended: suspendedFirms,
      verified: verifiedFirms,
      paying: payingFirms,
      free: totalFirms - payingFirms,
    },
    mrr,
    arr: mrr * 12,
    gmv: Number(dealAgg._sum.agreedPrice ?? 0),
    brokerageVolume: Number(dealAgg._sum.totalBrokerage ?? 0),
    totals: { listings, activeBookings, leads, deals, owners },
    signupSeries: { labels, counts },
    byPlan,
    byState,
    byFirmType,
  };
}

function sixMonthsAgo(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - 5, 1);
}

// Always show the canonical tiers in the per-plan table even at zero firms.
function plan_isCore(id: string): boolean {
  return ["free", "starter", "pro", "elite"].includes(id);
}
