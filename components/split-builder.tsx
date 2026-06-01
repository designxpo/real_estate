"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Split = {
  id: string;
  userName: string | null;
  externalName: string | null;
  role: string;
  amount: string | number;
  tdsAmount: string | number;
  netAmount: string | number;
  status: string;
};

export function SplitBuilder({
  dealId,
  totalBrokerage,
  splits,
}: {
  dealId: string;
  totalBrokerage: number;
  splits: Split[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const allocated = splits.reduce((acc, s) => acc + Number(s.amount), 0);
  const coverage = totalBrokerage > 0 ? Math.round((allocated / totalBrokerage) * 100) : 0;

  async function addSplit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    await fetch(`/api/deals/${dealId}/splits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        externalName: fd.get("externalName") || undefined,
        role: fd.get("role") || "sourcing",
        pctOfTotal: fd.get("pctOfTotal") ? Number(fd.get("pctOfTotal")) : undefined,
        amount: fd.get("amount") ? Number(fd.get("amount")) : undefined,
        tdsPct: fd.get("tdsPct") ? Number(fd.get("tdsPct")) : 5,
      }),
    });
    setBusy(false);
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  async function mark(id: string, status: string) {
    await fetch(`/api/splits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/splits/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const input = "bg-surface-2 border border-line rounded-inner px-2 py-1.5 text-sm text-ink";

  return (
    <div className="bg-surface border border-line rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-ink-muted">Commission splits</h2>
        <span className={`text-xs ${coverage > 100 ? "text-red-400" : "text-ink-faint"}`}>
          {coverage}% of ₹{totalBrokerage.toLocaleString("en-IN")} allocated
        </span>
      </div>

      <div className="space-y-1">
        {splits.map((s) => (
          <div key={s.id} className="flex items-center justify-between text-sm border border-line rounded-inner px-3 py-2">
            <div>
              <span className="text-ink">{s.userName || s.externalName || "—"}</span>
              <span className="text-ink-faint"> · {s.role}</span>
              <div className="text-[11px] text-ink-faint">
                ₹{Number(s.amount).toLocaleString("en-IN")} − TDS ₹{Number(s.tdsAmount).toLocaleString("en-IN")} = ₹{Number(s.netAmount).toLocaleString("en-IN")} · {s.status}
              </div>
            </div>
            <div className="flex gap-1">
              {s.status !== "paid" && (
                <button onClick={() => mark(s.id, "paid")} className="text-[11px] px-2 py-1 rounded border border-emerald-500 text-emerald-300">Paid</button>
              )}
              <button onClick={() => remove(s.id)} className="text-[11px] px-2 py-1 rounded border border-line text-ink-muted">✕</button>
            </div>
          </div>
        ))}
        {splits.length === 0 && <div className="text-sm text-ink-faint">No splits yet.</div>}
      </div>

      <form onSubmit={addSplit} className="flex flex-wrap gap-2 items-end pt-2 border-t border-line">
        <input name="externalName" placeholder="Recipient" className={input} />
        <select name="role" className={input}>
          <option value="sourcing">Sourcing</option>
          <option value="closing">Closing</option>
          <option value="reference">Reference</option>
          <option value="principal">Principal</option>
          <option value="showing">Showing</option>
          <option value="other">Other</option>
        </select>
        <input name="pctOfTotal" type="number" step="0.01" placeholder="% of total" className={`${input} w-24`} />
        <input name="amount" type="number" step="0.01" placeholder="or ₹ amount" className={`${input} w-28`} />
        <input name="tdsPct" type="number" step="0.01" defaultValue={5} placeholder="TDS %" className={`${input} w-20`} />
        <button disabled={busy} className="text-sm px-3 py-1.5 rounded-inner bg-accent text-white disabled:opacity-50">Add</button>
      </form>
    </div>
  );
}
