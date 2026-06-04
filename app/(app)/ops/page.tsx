import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth";

export const dynamic = "force-dynamic";

const PRIORITY: Record<string, string> = {
  urgent: "bg-urgent-soft text-urgent",
  high: "bg-high-soft text-high",
  normal: "bg-normal-soft text-normal",
};
const OPEN = ["new", "assigned", "in_progress"];

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default async function OpsOverviewPage() {
  const user = await requireUserPage();
  if (user.role === "sub_broker") redirect("/home");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const in60 = new Date(now.getTime() + 60 * 86_400_000);

  const [units, activeLeases, workOrders] = await Promise.all([
    prisma.pmUnit.findMany({ where: { firmId: user.firmId }, orderBy: [{ building: "asc" }, { label: "asc" }] }),
    prisma.pmLease.findMany({
      where: { firmId: user.firmId, status: "active" },
      include: { tenant: { select: { name: true } }, unit: { select: { label: true, building: true } } },
    }),
    prisma.pmWorkOrder.findMany({
      where: { firmId: user.firmId },
      orderBy: { createdAt: "desc" },
      include: { unit: { select: { label: true, building: true } } },
      take: 200,
    }),
  ]);

  const total = units.length;
  const occupied = units.filter((u) => u.status === "occupied").length;
  const vacant = units.filter((u) => u.status === "vacant").length;
  const leasedPct = total ? Math.round((occupied / total) * 100) : 0;
  const rentRoll = activeLeases.reduce((a, l) => a + Number(l.rentAmount), 0);
  const open = workOrders.filter((w) => OPEN.includes(w.status));
  const delayed = open.filter((w) => w.slaDueAt && w.slaDueAt < now);
  const requests = workOrders.filter((w) => w.status === "new").slice(0, 6);
  const maintThisMonth = workOrders
    .filter((w) => w.createdAt >= monthStart && w.costAmount)
    .reduce((a, w) => a + Number(w.costAmount), 0);
  const upcoming = activeLeases.filter((l) => l.endDate && l.endDate <= in60);

  // Portfolio grouped by building.
  const byBuilding = new Map<string, { total: number; occupied: number }>();
  for (const u of units) {
    const k = u.building || "Unassigned";
    const g = byBuilding.get(k) ?? { total: 0, occupied: 0 };
    g.total++;
    if (u.status === "occupied") g.occupied++;
    byBuilding.set(k, g);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Operations</h1>
          <p className="text-sm text-ink-muted">Your managed rentals — occupancy, maintenance & rent at a glance.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/ops/units" className="text-sm px-3 py-1.5 rounded-inner border border-line hover:border-accent/60">Units</Link>
          <Link href="/ops/work-orders" className="text-sm px-3 py-1.5 rounded-inner border border-line hover:border-accent/60">Work orders</Link>
          <Link href="/ops/rent" className="text-sm px-3 py-1.5 rounded-inner border border-line hover:border-accent/60">Rent</Link>
        </div>
      </div>

      {/* KPI summary row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Monthly rent roll" value={inr(rentRoll)} sub={`${activeLeases.length} active lease${activeLeases.length === 1 ? "" : "s"}`} />
        <Kpi label="Occupancy" value={`${leasedPct}%`} sub={`${occupied}/${total} occupied`} />
        <Kpi label="Open work orders" value={String(open.length)} sub={delayed.length ? `${delayed.length} overdue` : "on track"} tone={delayed.length ? "urgent" : "normal"} />
        <Kpi label="Maintenance (mo)" value={inr(maintThisMonth)} sub="logged this month" />
      </div>

      {total === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-10 text-center">
          <p className="text-ink-muted text-sm">No units yet. Add the rentals you manage to track occupancy, tenants & maintenance.</p>
          <Link href="/ops/units" className="inline-block mt-3 text-sm px-4 py-2 rounded-inner bg-accent text-white">Add your first unit</Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Tenant requests */}
          <section className="rounded-lg border border-line bg-surface p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">New requests</h2>
              <Link href="/ops/work-orders" className="text-xs text-accent hover:underline">All →</Link>
            </div>
            {requests.length === 0 ? (
              <p className="text-sm text-ink-muted py-4 text-center">No new requests.</p>
            ) : (
              <div className="space-y-2">
                {requests.map((w) => (
                  <div key={w.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <div className="text-ink truncate">{w.title}</div>
                      <div className="text-xs text-ink-muted truncate">
                        {[w.unit ? [w.unit.building, w.unit.label].filter(Boolean).join(" ") : null, w.category, w.raisedByTenant ? "tenant" : null].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full ${PRIORITY[w.priority]}`}>{w.priority}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Delayed work orders */}
          <section className="rounded-lg border border-line bg-surface p-4">
            <h2 className="font-semibold mb-3">Delayed work orders</h2>
            {delayed.length === 0 ? (
              <p className="text-sm text-ink-muted py-4 text-center">Nothing overdue 🎉</p>
            ) : (
              <div className="space-y-2">
                {delayed.slice(0, 6).map((w) => {
                  const lateDays = Math.ceil((now.getTime() - w.slaDueAt!.getTime()) / 86_400_000);
                  return (
                    <div key={w.id} className="flex items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <div className="text-ink truncate">{w.title}</div>
                        <div className="text-xs text-ink-muted truncate">{w.assignee ?? "Unassigned"} · {w.category}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-urgent">{lateDays}d late</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${PRIORITY[w.priority]}`}>{w.priority}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Portfolio */}
          <section className="rounded-lg border border-line bg-surface p-4">
            <h2 className="font-semibold mb-3">Portfolio</h2>
            <div className="space-y-3">
              {[...byBuilding.entries()].map(([name, g]) => {
                const pct = g.total ? Math.round((g.occupied / g.total) * 100) : 0;
                return (
                  <div key={name}>
                    <div className="flex justify-between text-sm">
                      <span className="text-ink truncate">{name}</span>
                      <span className="text-ink-muted">{g.occupied}/{g.total} · {pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-2 mt-1 overflow-hidden">
                      <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Upcoming */}
          <section className="rounded-lg border border-line bg-surface p-4">
            <h2 className="font-semibold mb-3">Leases ending soon</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-ink-muted py-4 text-center">No leases ending in 60 days.</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <div className="text-ink truncate">{[l.unit.building, l.unit.label].filter(Boolean).join(" ")}</div>
                      <div className="text-xs text-ink-muted truncate">{l.tenant.name} · {inr(Number(l.rentAmount))}/mo</div>
                    </div>
                    <span className="text-xs text-high shrink-0">{l.endDate!.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, sub, tone = "normal" }: { label: string; value: string; sub?: string; tone?: "normal" | "urgent" }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="text-xs text-ink-muted">{label}</div>
      <div className="text-2xl font-semibold text-ink tabular-nums mt-1">{value}</div>
      {sub && <div className={`text-xs mt-0.5 ${tone === "urgent" ? "text-urgent" : "text-ink-faint"}`}>{sub}</div>}
    </div>
  );
}
