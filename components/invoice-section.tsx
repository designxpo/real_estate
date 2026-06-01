"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Invoice = { id: string; invoiceNumber: string; totalAmount: string | number; status: string };

export function InvoiceSection({
  dealId,
  contactId,
  defaultBase,
  invoices,
}: {
  dealId: string;
  contactId: string;
  defaultBase: number;
  invoices: Invoice[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dealId,
        contactId,
        brokerageBase: Number(fd.get("brokerageBase")),
        gstPct: Number(fd.get("gstPct")) || 18,
        billedToState: fd.get("billedToState") || undefined,
      }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  const input = "bg-surface-2 border border-line rounded-inner px-2 py-1.5 text-sm text-ink";

  return (
    <div className="bg-surface border border-line rounded-lg p-4 space-y-3">
      <h2 className="text-sm font-medium text-ink-muted">Invoices</h2>
      <div className="space-y-1">
        {invoices.map((inv) => (
          <div key={inv.id} className="flex items-center justify-between text-sm border border-line rounded-inner px-3 py-2">
            <span className="font-mono text-ink">{inv.invoiceNumber}</span>
            <span className="text-ink-muted">₹{Number(inv.totalAmount).toLocaleString("en-IN")} · {inv.status}</span>
            <Link href={`/invoices/${inv.id}`} className="text-xs text-accent">View</Link>
          </div>
        ))}
        {invoices.length === 0 && <div className="text-sm text-ink-faint">No invoices yet.</div>}
      </div>
      <form onSubmit={create} className="flex flex-wrap gap-2 items-end pt-2 border-t border-line">
        <input name="brokerageBase" type="number" step="0.01" defaultValue={defaultBase} placeholder="Base ₹" className={`${input} w-32`} />
        <input name="gstPct" type="number" step="0.01" defaultValue={18} placeholder="GST %" className={`${input} w-20`} />
        <input name="billedToState" placeholder="Billed-to state" className={input} />
        <button disabled={busy} className="text-sm px-3 py-1.5 rounded-inner bg-accent text-white disabled:opacity-50">Generate invoice</button>
      </form>
    </div>
  );
}
