import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth";
import { leadVisibility, dealVisibility } from "@/lib/scope";
import { getChecklist, checklistProgress } from "@/lib/checklist";
import { Card } from "@/components/ui/card";
import { Pill, StatusDot } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import { GettingStarted } from "@/components/getting-started";
import { Sparkline } from "@/components/sparkline";
import { getPlan, PLANS } from "@/lib/plans";
import { LEAD_NEXT } from "@/lib/next-action";
import { STAGE_LABELS, STAGE_COLORS } from "@/lib/leads";

// lakh/crore/per-* → absolute rupees (for ₹/sqft + yield comps).
function toAbs(amount: number, unit: string): number {
  if (unit === "lakh") return amount * 100_000;
  if (unit === "crore") return amount * 10_000_000;
  return amount;
}

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireUserPage();
  const firm = await prisma.firm.findUnique({ where: { id: user.firmId } });

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

  const [checklistItems, overdueFollowups, todaysFollowups, hotLeads, recentDeals] =
    await Promise.all([
      getChecklist(user.firmId),
      prisma.lead.findMany({
        where: {
          ...leadVisibility(user),
          nextFollowupAt: { lt: startOfToday },
          stage: { notIn: ["registered", "lost"] },
        },
        include: { contact: { select: { name: true, phone: true } }, property: { select: { title: true } } },
        orderBy: { nextFollowupAt: "asc" },
        take: 5,
      }),
      prisma.lead.findMany({
        where: {
          ...leadVisibility(user),
          nextFollowupAt: { gte: startOfToday, lt: endOfToday },
          stage: { notIn: ["registered", "lost"] },
        },
        include: { contact: { select: { name: true, phone: true } }, property: { select: { title: true } } },
        orderBy: { nextFollowupAt: "asc" },
        take: 5,
      }),
      prisma.lead.findMany({
        where: {
          ...leadVisibility(user),
          stage: { in: ["negotiating", "token", "agreement"] },
        },
        include: { contact: { select: { name: true } }, property: { select: { title: true } } },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      prisma.deal.findMany({
        where: dealVisibility(user),
        orderBy: { updatedAt: "desc" },
        include: {
          property: { select: { title: true } },
          marketplaceListing: { select: { title: true } },
          buyer: { select: { name: true } },
        },
        take: 5,
      }),
    ]);

  // §4C KPI chips + market insight.
  const weekEnd = new Date(startOfToday.getTime() + 7 * 24 * 3600 * 1000);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const [activeListings, newLeads, dealsClosing, visitsThisWeek, leadDates, saleComps, rentComps] = await Promise.all([
    prisma.property.count({ where: { firmId: user.firmId, status: "active" } }),
    prisma.lead.count({ where: { ...leadVisibility(user), stage: { in: ["new", "contacted"] } } }),
    prisma.deal.count({ where: { ...dealVisibility(user), stage: { in: ["token", "agreement", "registration"] } } }),
    prisma.siteVisit.count({ where: { status: "scheduled", scheduledAt: { gte: startOfToday, lt: weekEnd }, lead: leadVisibility(user) } }),
    prisma.lead.findMany({ where: { firmId: user.firmId, createdAt: { gte: sixMonthsAgo } }, select: { createdAt: true } }),
    prisma.property.findMany({
      where: { firmId: user.firmId, listingType: "sale", carpetSqft: { gt: 0 }, ...(firm?.city ? { city: firm.city } : {}) },
      select: { priceAmount: true, priceUnit: true, carpetSqft: true },
    }),
    prisma.property.findMany({
      where: { firmId: user.firmId, listingType: "rent", priceUnit: "per_month", ...(firm?.city ? { city: firm.city } : {}) },
      select: { priceAmount: true },
    }),
  ]);

  // 6-month new-leads trend (oldest → newest) for the momentum sparkline.
  const buckets = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString("en-IN", { month: "short" }), count: 0 };
  });
  const bucketIndex = new Map(buckets.map((b, i) => [b.key, i]));
  for (const l of leadDates) {
    const k = `${l.createdAt.getFullYear()}-${l.createdAt.getMonth()}`;
    const i = bucketIndex.get(k);
    if (i !== undefined) buckets[i].count++;
  }
  const leadsTrend = buckets.map((b) => b.count);

  // Indicative comps for the firm's primary city.
  const pricePerSqft = saleComps.length
    ? Math.round(saleComps.reduce((a, p) => a + toAbs(Number(p.priceAmount), p.priceUnit) / (p.carpetSqft || 1), 0) / saleComps.length)
    : null;
  const avgRent = rentComps.length
    ? Math.round(rentComps.reduce((a, p) => a + Number(p.priceAmount), 0) / rentComps.length)
    : null;
  const avgSale = saleComps.length
    ? saleComps.reduce((a, p) => a + toAbs(Number(p.priceAmount), p.priceUnit), 0) / saleComps.length
    : null;
  const indicativeYield = avgRent && avgSale ? ((avgRent * 12) / avgSale) * 100 : null;

  const plan = getPlan(firm?.planId);
  const nextPlan = PLANS.find((p) => p.priceMonthly > plan.priceMonthly);

  const checklist = checklistProgress(checklistItems);
  const greeting = greetingFor(now);

  return (
    <div className="space-y-6">
      {/* Hero strip */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-ink-muted">
            {greeting}, {user.name.split(" ")[0]}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {firm?.name ?? "Welcome"}
          </h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-ink-muted">
            <span className="px-2 py-0.5 rounded-full bg-accent-soft text-accent capitalize">{user.role.replace(/_/g, " ")}</span>
            {firm?.city && <span>{[firm.city, firm.state].filter(Boolean).join(", ")}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/leads/new">
            <Button>+ New lead</Button>
          </Link>
          <Link href="/properties/new">
            <Button variant="secondary">+ New property</Button>
          </Link>
        </div>
      </div>

      {/* KPI quick-filter chips (§4C) — click through to the relevant section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiChip href="/properties" label="Active listings" value={activeListings} tone="neutral" />
        <KpiChip href="/leads" label="New leads" value={newLeads} tone="blue" />
        <KpiChip href="/leads" label="Visits this week" value={visitsThisWeek} tone="amber" />
        <KpiChip href="/deals" label="Deals closing" value={dealsClosing} tone="green" />
      </div>

      {/* Market insight + upsell */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold">Pipeline momentum</h3>
            <span className="text-xs text-ink-faint">last 6 months</span>
          </div>
          <p className="text-xs text-ink-muted mb-3">New leads per month</p>
          <Sparkline data={leadsTrend} />
          <div className="flex justify-between text-[10px] text-ink-faint mt-1">
            {buckets.map((b) => <span key={b.key}>{b.label}</span>)}
          </div>
          <div className="mt-4 pt-3 border-t border-line grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-ink-muted">Avg asking {firm?.city ? `· ${firm.city}` : ""}</div>
              <div className="font-semibold text-ink tabular-nums">{pricePerSqft ? `₹${pricePerSqft.toLocaleString("en-IN")}/sqft` : "—"}</div>
            </div>
            <div>
              <div className="text-xs text-ink-muted">Indicative rental yield</div>
              <div className="font-semibold text-ink tabular-nums">{indicativeYield ? `${indicativeYield.toFixed(1)}%` : "—"}</div>
            </div>
          </div>
          <p className="text-[10px] text-ink-faint mt-2">Indicative, from your own listings in {firm?.city ?? "your city"}. Not a valuation.</p>
        </Card>

        <Card className="flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold">Your plan</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent-soft text-accent">{plan.name}</span>
          </div>
          <p className="text-sm text-ink-muted">
            {plan.maxActiveBookings} active marketplace booking{plan.maxActiveBookings === 1 ? "" : "s"} on your plan.
          </p>
          <div className="flex-1" />
          {nextPlan ? (
            <Link href="/billing" className="mt-4 inline-block text-sm px-4 py-2 rounded-inner bg-accent text-white text-center">
              Upgrade to {nextPlan.name} → {nextPlan.maxActiveBookings} bookings
            </Link>
          ) : (
            <Link href="/billing" className="mt-4 inline-block text-sm text-accent hover:underline">Manage plan →</Link>
          )}
        </Card>
      </div>

      {/* Getting Started — hide once everything is done */}
      {checklist.done < checklist.total && (
        <GettingStarted
          items={checklistItems}
          done={checklist.done}
          total={checklist.total}
          pct={checklist.pct}
        />
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Today's follow-ups */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Today's follow-ups</h3>
            <Link href="/leads" className="text-xs text-accent hover:underline">
              See all →
            </Link>
          </div>
          {overdueFollowups.length === 0 && todaysFollowups.length === 0 ? (
            <p className="text-sm text-ink-muted py-4 text-center">No follow-ups due 🎉</p>
          ) : (
            <div className="space-y-2">
              {overdueFollowups.map((l) => (
                <FollowupRow
                  key={l.id}
                  id={l.id}
                  name={l.contact.name}
                  phone={l.contact.phone}
                  property={l.property?.title}
                  due={l.nextFollowupAt}
                  overdue
                  stage={l.stage}
                />
              ))}
              {todaysFollowups.map((l) => (
                <FollowupRow
                  key={l.id}
                  id={l.id}
                  name={l.contact.name}
                  phone={l.contact.phone}
                  property={l.property?.title}
                  due={l.nextFollowupAt}
                  stage={l.stage}
                />
              ))}
            </div>
          )}
        </Card>

        {/* Hot leads */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Hot pipeline</h3>
            <Link href="/leads" className="text-xs text-accent hover:underline">
              See all →
            </Link>
          </div>
          {hotLeads.length === 0 ? (
            <p className="text-sm text-ink-muted py-4 text-center">
              No active deals in negotiation. Hot leads (negotiating, token, agreement) show up here.
            </p>
          ) : (
            <div className="space-y-2">
              {hotLeads.map((l) => {
                const next = LEAD_NEXT[l.stage];
                return (
                  <Link
                    key={l.id}
                    href={`/leads/${l.id}`}
                    className="flex items-center justify-between p-3 rounded-inner bg-surface-2 hover:bg-surface-3 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{l.contact.name}</div>
                      <div className="text-xs text-ink-muted truncate">
                        {l.property?.title ?? "No property linked"}
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${STAGE_COLORS[l.stage]}`}>
                        {STAGE_LABELS[l.stage]}
                      </span>
                      {next && <Pill tone={next.tone} size="xs">{next.label}</Pill>}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Recent deals */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Recent deals</h3>
          <Link href="/deals" className="text-xs text-accent hover:underline">
            See all →
          </Link>
        </div>
        {recentDeals.length === 0 ? (
          <p className="text-sm text-ink-muted py-4 text-center">
            No deals yet. Convert a lead at "Negotiating" stage to start one.
          </p>
        ) : (
          <div className="divide-y divide-line">
            {recentDeals.map((d) => (
              <Link
                key={d.id}
                href={`/deals/${d.id}`}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0 hover:bg-hover -mx-2 px-2 rounded"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{d.property?.title ?? d.marketplaceListing?.title ?? "Marketplace deal"}</div>
                  <div className="text-xs text-ink-muted truncate">
                    Buyer: {d.buyer.name}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold text-accent-glow" data-numeric>
                    ₹{Number(d.totalBrokerage).toLocaleString("en-IN")}
                  </div>
                  <Pill tone={d.stage === "registration" || d.stage === "completed" ? "green" : d.stage === "cancelled" ? "red" : "blue"} size="xs">
                    {d.stage}
                  </Pill>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function KpiChip({
  href,
  label,
  value,
  tone = "neutral",
}: {
  href: string;
  label: string;
  value: number | string;
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
    <Link href={href} className="rounded-card border border-line bg-surface p-4 hover:border-accent/60 transition-colors block">
      <div className="flex items-center gap-1.5 text-xs text-ink-muted">
        <StatusDot tone={tone} />
        {label}
      </div>
      <div className={`text-3xl font-semibold mt-1 ${colors[tone]} tabular-nums`}>{value}</div>
    </Link>
  );
}

function FollowupRow({
  id,
  name,
  phone,
  property,
  due,
  overdue,
  stage,
}: {
  id: string;
  name: string;
  phone: string;
  property?: string;
  due: Date | null;
  overdue?: boolean;
  stage: keyof typeof STAGE_LABELS;
}) {
  return (
    <Link
      href={`/leads/${id}`}
      className="flex items-center justify-between p-3 rounded-inner bg-surface-2 hover:bg-surface-3 transition-colors"
    >
      <div className="min-w-0">
        <div className="font-medium truncate flex items-center gap-2">
          {name}
          {overdue && <Pill tone="red" size="xs">overdue</Pill>}
        </div>
        <div className="text-xs text-ink-muted truncate">
          {property ? `${property} · ` : ""}{phone}
        </div>
      </div>
      <div className="text-right text-xs shrink-0">
        <div className="text-ink-muted">{due ? due.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</div>
        <div className="text-ink-faint capitalize">{STAGE_LABELS[stage]}</div>
      </div>
    </Link>
  );
}
