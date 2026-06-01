import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth";

export const dynamic = "force-dynamic";

function daysSince(d: Date): number {
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export default async function CommissionReportPage() {
  const user = await requireUserPage();
  const splits = await prisma.commissionSplit.findMany({
    where: { deal: { firmId: user.firmId } },
    include: { user: { select: { name: true } }, deal: { select: { property: { select: { title: true } } } } },
  });

  // Aging buckets on outstanding (pending/payable) commissions.
  const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  for (const s of splits) {
    if (s.status === "pending" || s.status === "payable") {
      const age = daysSince(s.createdAt);
      const net = Number(s.netAmount);
      if (age <= 30) buckets["0-30"] += net;
      else if (age <= 60) buckets["31-60"] += net;
      else if (age <= 90) buckets["61-90"] += net;
      else buckets["90+"] += net;
    }
  }

  // By broker.
  const byBroker = new Map<string, { name: string; earned: number; paid: number; payable: number; tds: number }>();
  for (const s of splits) {
    const key = s.userId ?? `ext:${s.externalName ?? "external"}`;
    const name = s.user?.name ?? s.externalName ?? "External";
    const row = byBroker.get(key) ?? { name, earned: 0, paid: 0, payable: 0, tds: 0 };
    row.earned += Number(s.amount);
    row.tds += Number(s.tdsAmount);
    if (s.status === "paid") row.paid += Number(s.netAmount);
    if (s.status === "payable") row.payable += Number(s.netAmount);
    byBroker.set(key, row);
  }

  const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Commission reports</h1>
        <div className="flex gap-2">
          <a href="/api/exports/commissions" className="text-xs px-3 py-1.5 rounded-inner border border-line text-ink-muted hover:bg-hover">Export CSV</a>
          <a href="/api/exports/commissions?view=tds" className="text-xs px-3 py-1.5 rounded-inner border border-line text-ink-muted hover:bg-hover">TDS register CSV</a>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-ink-muted mb-2">Outstanding aging</h2>
        <div className="grid grid-cols-4 gap-3">
          {Object.entries(buckets).map(([k, v]) => (
            <div key={k} className="bg-surface border border-line rounded-lg p-3">
              <div className="text-xs text-ink-faint">{k} days</div>
              <div className="text-lg font-semibold text-ink">{inr(v)}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-ink-muted mb-2">By broker</h2>
        <div className="bg-surface border border-line rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-faint border-b border-line">
                <th className="p-3">Broker</th><th className="p-3 text-right">Earned</th>
                <th className="p-3 text-right">Paid</th><th className="p-3 text-right">Payable</th><th className="p-3 text-right">TDS</th>
              </tr>
            </thead>
            <tbody>
              {[...byBroker.values()].map((r) => (
                <tr key={r.name} className="border-b border-line/50">
                  <td className="p-3 text-ink">{r.name}</td>
                  <td className="p-3 text-right">{inr(r.earned)}</td>
                  <td className="p-3 text-right text-emerald-300">{inr(r.paid)}</td>
                  <td className="p-3 text-right text-amber-300">{inr(r.payable)}</td>
                  <td className="p-3 text-right text-ink-muted">{inr(r.tds)}</td>
                </tr>
              ))}
              {byBroker.size === 0 && (
                <tr><td colSpan={5} className="p-4 text-center text-ink-faint">No commissions yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
