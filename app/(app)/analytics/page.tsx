import Link from "next/link";
import { requireUserPage } from "@/lib/auth";
import { getAnalytics, type Range } from "@/lib/analytics";
import { STAGE_LABELS } from "@/lib/leads";

export const dynamic = "force-dynamic";

const RANGES: Range[] = ["7d", "30d", "90d", "1yr", "all"];

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const user = await requireUserPage();
  const { range: rawRange } = await searchParams;
  const range = (RANGES.includes(rawRange as Range) ? rawRange : "30d") as Range;
  const a = await getAnalytics(user.firmId, range);

  const maxFunnel = Math.max(1, ...a.funnel.map((f) => f.count));
  const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <Link key={r} href={`/analytics?range=${r}`} className={`text-xs px-2.5 py-1 rounded-inner border ${r === range ? "border-accent text-accent" : "border-line text-ink-muted"}`}>
              {r}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Leads" value={String(a.totals.leads)} />
        <Stat label="Deals closed" value={String(a.totals.dealsClosed)} />
        <Stat label="Brokerage closed" value={inr(a.totals.brokerageClosed)} />
        <Stat label="Lead → deal" value={`${a.totals.conversionPct}%`} />
      </div>

      <div className="bg-surface border border-line rounded-lg p-4">
        <h2 className="text-sm font-medium text-ink-muted mb-3">Lead funnel</h2>
        <div className="space-y-1.5">
          {a.funnel.map((f) => (
            <div key={f.stage} className="flex items-center gap-3">
              <div className="w-32 text-xs text-ink-muted">{STAGE_LABELS[f.stage]}</div>
              <div className="flex-1 bg-surface-2 rounded-full h-5 overflow-hidden">
                <div className="h-full bg-accent" style={{ width: `${(f.count / maxFunnel) * 100}%` }} />
              </div>
              <div className="w-8 text-xs text-ink text-right">{f.count}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Table title="By source" rows={a.bySource.map((s) => [s.source, String(s.leads)])} cols={["Source", "Leads"]} />
        <Table title="By locality" rows={a.byLocality.map((l) => [l.locality, String(l.leads)])} cols={["Locality", "Leads"]} />
      </div>

      <div className="bg-surface border border-line rounded-lg overflow-hidden">
        <h2 className="text-sm font-medium text-ink-muted p-3 pb-0">By broker</h2>
        <table className="w-full text-sm mt-2">
          <thead><tr className="text-left text-ink-faint border-b border-line">
            <th className="p-3">Broker</th><th className="p-3 text-right">Leads</th><th className="p-3 text-right">Registered</th><th className="p-3 text-right">Deals</th><th className="p-3 text-right">Earned</th>
          </tr></thead>
          <tbody>
            {a.byBroker.map((b) => (
              <tr key={b.name} className="border-b border-line/50">
                <td className="p-3 text-ink">{b.name}</td>
                <td className="p-3 text-right">{b.leads}</td>
                <td className="p-3 text-right">{b.registered}</td>
                <td className="p-3 text-right">{b.deals}</td>
                <td className="p-3 text-right">{inr(b.earned)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface border border-line rounded-lg p-3">
      <div className="text-xs text-ink-faint">{label}</div>
      <div className="text-xl font-semibold text-ink">{value}</div>
    </div>
  );
}

function Table({ title, cols, rows }: { title: string; cols: string[]; rows: string[][] }) {
  return (
    <div className="bg-surface border border-line rounded-lg overflow-hidden">
      <h2 className="text-sm font-medium text-ink-muted p-3 pb-0">{title}</h2>
      <table className="w-full text-sm mt-2">
        <thead><tr className="text-left text-ink-faint border-b border-line">{cols.map((c) => <th key={c} className="p-3">{c}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line/50">{r.map((c, j) => <td key={j} className="p-3 text-ink">{c}</td>)}</tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={cols.length} className="p-4 text-center text-ink-faint">No data</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
