"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const input = "w-full bg-surface-2 border border-line rounded-inner px-3 py-2 text-sm text-ink";
const label = "block text-xs text-ink-muted mb-1";

async function postJson(url: string, body: unknown, method = "POST") {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.ok;
}

function FormShell({
  open, setOpen, cta, children, onSubmit, busy, error,
}: {
  open: boolean; setOpen: (v: boolean) => void; cta: string;
  children: React.ReactNode; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; busy: boolean; error: string | null;
}) {
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm px-4 py-2 rounded-inner bg-accent text-white">{cta}</button>
    );
  }
  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-line bg-surface p-4 space-y-3">
      {children}
      {error && <div className="text-sm text-urgent">{error}</div>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="text-sm px-4 py-2 rounded-inner bg-accent text-white disabled:opacity-60">
          {busy ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm px-4 py-2 rounded-inner border border-line text-ink-muted">Cancel</button>
      </div>
    </form>
  );
}

export function AddUnitForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null);
    const f = new FormData(e.currentTarget);
    const ok = await postJson("/api/pm/units", Object.fromEntries([...f.entries()].map(([k, v]) => [k, (v as string).trim()])));
    setBusy(false);
    if (ok) { setOpen(false); router.refresh(); } else setError("Could not add unit.");
  }
  return (
    <FormShell open={open} setOpen={setOpen} cta="+ Add unit" onSubmit={submit} busy={busy} error={error}>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className={label}>Unit label *</label><input name="label" required placeholder="A-302" className={input} /></div>
        <div><label className={label}>Building</label><input name="building" placeholder="Sunrise Residency" className={input} /></div>
        <div><label className={label}>Bedrooms</label><input name="bedrooms" type="number" min={0} className={input} /></div>
        <div><label className={label}>Area (sqft)</label><input name="sqft" type="number" min={0} className={input} /></div>
        <div><label className={label}>Market rent (₹/mo)</label><input name="marketRent" type="number" min={0} className={input} /></div>
        <div><label className={label}>City</label><input name="city" className={input} /></div>
      </div>
      <div><label className={label}>Address</label><input name="addressLine" className={input} /></div>
    </FormShell>
  );
}

export function LeaseForm({ unitId }: { unitId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null);
    const f = new FormData(e.currentTarget);
    const body = { unitId, ...Object.fromEntries([...f.entries()].map(([k, v]) => [k, (v as string).trim()])) };
    const ok = await postJson("/api/pm/leases", body);
    setBusy(false);
    if (ok) { setOpen(false); router.refresh(); } else setError("Could not create lease.");
  }
  return (
    <FormShell open={open} setOpen={setOpen} cta="Add tenant & lease" onSubmit={submit} busy={busy} error={error}>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className={label}>Tenant name *</label><input name="tenantName" required className={input} /></div>
        <div><label className={label}>Tenant phone *</label><input name="tenantPhone" required className={input} /></div>
        <div><label className={label}>Email</label><input name="tenantEmail" type="email" className={input} /></div>
        <div><label className={label}>Monthly rent (₹) *</label><input name="rentAmount" type="number" required min={0} className={input} /></div>
        <div><label className={label}>Deposit (₹)</label><input name="depositAmount" type="number" min={0} className={input} /></div>
        <div><label className={label}>Rent due day (1–28)</label><input name="rentDueDay" type="number" min={1} max={28} defaultValue={5} className={input} /></div>
        <div><label className={label}>Start date *</label><input name="startDate" type="date" required className={input} /></div>
        <div><label className={label}>End date</label><input name="endDate" type="date" className={input} /></div>
      </div>
    </FormShell>
  );
}

export function WorkOrderForm({ units }: { units: { id: string; label: string; building: string | null }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null);
    const f = new FormData(e.currentTarget);
    const ok = await postJson("/api/pm/work-orders", Object.fromEntries([...f.entries()].map(([k, v]) => [k, (v as string).trim()])));
    setBusy(false);
    if (ok) { setOpen(false); router.refresh(); } else setError("Could not create work order.");
  }
  return (
    <FormShell open={open} setOpen={setOpen} cta="+ New work order" onSubmit={submit} busy={busy} error={error}>
      <div><label className={label}>Title *</label><input name="title" required placeholder="Leaking kitchen tap" className={input} /></div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={label}>Unit</label>
          <select name="unitId" className={input} defaultValue="">
            <option value="">— none —</option>
            {units.map((u) => <option key={u.id} value={u.id}>{[u.building, u.label].filter(Boolean).join(" · ")}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Category</label>
          <select name="category" className={input} defaultValue="other">
            {["plumbing", "electrical", "hvac", "carpentry", "cleaning", "other"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Priority</label>
          <select name="priority" className={input} defaultValue="normal">
            {["urgent", "high", "normal"].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div><label className={label}>SLA (days)</label><input name="slaDays" type="number" min={0} defaultValue={3} className={input} /></div>
        <div><label className={label}>Assignee</label><input name="assignee" placeholder="Plumber / staff" className={input} /></div>
      </div>
      <div><label className={label}>Description</label><textarea name="description" rows={2} className={input} /></div>
      <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" name="raisedByTenant" value="true" /> Raised by tenant</label>
    </FormShell>
  );
}

const NEXT_STATUS: Record<string, { to: string; label: string } | null> = {
  new: { to: "assigned", label: "Assign" },
  assigned: { to: "in_progress", label: "Start" },
  in_progress: { to: "done", label: "Mark done" },
  done: null,
  cancelled: null,
};

export function WorkOrderActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const next = NEXT_STATUS[status];
  async function act(body: Record<string, unknown>) {
    setBusy(true);
    await postJson(`/api/pm/work-orders/${id}`, body, "PATCH");
    setBusy(false);
    router.refresh();
  }
  if (status === "done" || status === "cancelled") {
    return <span className="text-xs text-ink-faint">{status}</span>;
  }
  return (
    <div className="flex items-center gap-2">
      {next && (
        <button disabled={busy} onClick={() => act({ status: next.to })} className="text-xs px-2.5 py-1 rounded-inner bg-accent text-white disabled:opacity-50">{next.label}</button>
      )}
      <button disabled={busy} onClick={() => act({ status: "cancelled" })} className="text-xs px-2 py-1 rounded-inner border border-line text-ink-muted">Cancel</button>
    </div>
  );
}

export function GenerateRentButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await postJson("/api/pm/rent/generate", {});
        setBusy(false);
        router.refresh();
      }}
      className="text-sm px-4 py-2 rounded-inner bg-accent text-white disabled:opacity-60"
    >
      {busy ? "Generating…" : "Generate this month's rent"}
    </button>
  );
}

export function RecordPaymentForm({ leaseId, chargeId, defaultAmount }: { leaseId: string; chargeId?: string; defaultAmount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null);
    const f = new FormData(e.currentTarget);
    const body = { leaseId, chargeId, ...Object.fromEntries([...f.entries()].map(([k, v]) => [k, (v as string).trim()])) };
    const res = await fetch("/api/pm/rent/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (res.ok) {
      const d = await res.json();
      router.push(`/ops/rent/receipt/${d.id}`);
    } else setError("Could not record payment.");
  }
  if (!open) return <button onClick={() => setOpen(true)} className="text-xs px-2.5 py-1 rounded-inner bg-accent text-white">Record payment</button>;
  return (
    <form onSubmit={submit} className="mt-2 p-3 rounded-inner border border-line bg-surface-2/50 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div><label className={label}>Amount (₹)</label><input name="amount" type="number" required min={0} defaultValue={defaultAmount || ""} className={input} /></div>
        <div>
          <label className={label}>Method</label>
          <select name="method" className={input} defaultValue="upi">
            {["upi", "bank", "cash", "cheque"].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div><label className={label}>Reference / UTR (optional)</label><input name="reference" className={input} /></div>
      {error && <div className="text-xs text-urgent">{error}</div>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="text-xs px-3 py-1.5 rounded-inner bg-accent text-white disabled:opacity-60">{busy ? "Saving…" : "Save & receipt"}</button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs px-3 py-1.5 rounded-inner border border-line text-ink-muted">Cancel</button>
      </div>
    </form>
  );
}

export function UpiCollect({ upi }: { upi: string }) {
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !qr) {
      const QR = (await import("qrcode")).default;
      setQr(await QR.toDataURL(upi, { margin: 1, width: 180 }));
    }
  }
  return (
    <div>
      <button onClick={toggle} className="text-xs px-2.5 py-1 rounded-inner border border-accent text-accent hover:bg-accent/10">UPI</button>
      {open && (
        <div className="mt-2 p-3 rounded-inner border border-line bg-surface text-center space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {qr ? <img src={qr} alt="UPI QR" className="mx-auto" width={150} height={150} /> : <div className="text-xs text-ink-faint py-6">Generating…</div>}
          <a href={upi} className="block text-xs px-3 py-1.5 rounded-inner bg-accent text-white">Open UPI app</a>
          <button
            onClick={() => { navigator.clipboard?.writeText(upi); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="text-[11px] text-ink-muted hover:text-ink"
          >
            {copied ? "Copied ✓" : "Copy UPI link"}
          </button>
        </div>
      )}
    </div>
  );
}

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="text-sm px-4 py-2 rounded-inner bg-accent text-white print:hidden">
      Print / Save PDF
    </button>
  );
}

export function UnitStatusButton({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function set(s: string) {
    setBusy(true);
    await postJson(`/api/pm/units/${id}`, { status: s }, "PATCH");
    setBusy(false);
    router.refresh();
  }
  if (status === "occupied") {
    return <button disabled={busy} onClick={() => set("vacant")} className="text-xs px-2.5 py-1 rounded-inner border border-line text-ink-muted hover:text-ink">End lease</button>;
  }
  return null;
}
