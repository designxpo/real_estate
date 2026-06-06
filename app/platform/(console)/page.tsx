import Link from "next/link";
import { getPlatformMetrics } from "@/lib/platform-metrics";
import { Sparkline } from "@/components/sparkline";
import { Pill } from "@/components/ui/pill";

export const dynamic = "force-dynamic";

// Compact INR for big money figures (₹1.2Cr, ₹3.4L, ₹999).
function inr(n: number): string {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export default async function PlatformDashboard() {
  const m = await getPlatformMetrics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-ink-muted">Business health across all broker firms.</p>
      </div>

      {/* Headline KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="MRR" value={inr(m.mrr)} sub={`${inr(m.arr)} ARR`} />
        <Kpi label="Paying firms" value={m.firms.paying} sub={`${m.firms.total} total`} />
        <Kpi label="GMV (closed)" value={inr(m.gmv)} sub={`${inr(m.brokerageVolume)} brokerage`} />
        <Kpi label="Active bookings" value={m.totals.activeBookings} sub={`${m.totals.listings} listings`} />
      </div>

      {/* Firm health + signups */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">New firms / month</h2>
            <Link href="/platform/firms" className="text-xs text-accent hover:underline">View all firms →</Link>
          </div>
          <Sparkline data={m.signupSeries.counts} height={72} />
          <div className="flex justify-between mt-2 text-[11px] text-ink-faint">
            {m.signupSeries.labels.map((l, i) => (
              <span key={i}>{l}</span>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4 space-y-3">
          <h2 className="font-semibold">Firm status</h2>
          <Row label="Verified" value={m.firms.verified} tone="green" />
          <Row label="Paying" value={m.firms.paying} tone="blue" />
          <Row label="On Free" value={m.firms.free} tone="neutral" />
          <Row label="Suspended" value={m.firms.suspended} tone="red" />
        </div>
      </div>

      {/* Revenue by plan */}
      <section>
        <h2 className="font-semibold mb-2">Revenue by plan</h2>
        <div className="border border-line rounded-lg divide-y divide-line">
          <div className="grid grid-cols-4 gap-2 px-3 py-2 text-[11px] uppercase tracking-wide text-ink-faint">
            <span>Plan</span><span className="text-right">Price</span><span className="text-right">Firms</span><span className="text-right">MRR</span>
          </div>
          {m.byPlan.map((row) => (
            <div key={row.plan.id} className="grid grid-cols-4 gap-2 px-3 py-2 text-sm">
              <span className="text-ink">{row.plan.name}</span>
              <span className="text-right text-ink-muted tabular-nums">{row.plan.priceMonthly === 0 ? "Free" : inr(row.plan.priceMonthly)}</span>
              <span className="text-right text-ink tabular-nums">{row.firms}</span>
              <span className="text-right text-ink tabular-nums">{inr(row.mrr)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Distribution */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Distribution title="By state" rows={m.byState} />
        <Distribution title="By firm type" rows={m.byFirmType} />
      </div>

      {/* Pipeline totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="Owners" value={m.totals.owners} />
        <Kpi label="Leads" value={m.totals.leads} />
        <Kpi label="Deals" value={m.totals.deals} />
        <Kpi label="Listings" value={m.totals.listings} />
      </div>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="text-xs text-ink-muted">{label}</div>
      <div className="text-2xl font-semibold text-ink tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-ink-faint mt-0.5">{sub}</div>}
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: number; tone: "green" | "blue" | "neutral" | "red" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-ink-muted">{label}</span>
      <Pill tone={tone} size="sm">{value}</Pill>
    </div>
  );
}

function Distribution({ title, rows }: { title: string; rows: { label: string; count: number }[] }) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <section className="rounded-lg border border-line bg-surface p-4">
      <h2 className="font-semibold mb-3">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-faint">No data yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.label} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-ink-muted truncate">{r.label}</span>
                <span className="text-ink tabular-nums">{r.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                <div className="h-full bg-accent rounded-full" style={{ width: `${(r.count / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
