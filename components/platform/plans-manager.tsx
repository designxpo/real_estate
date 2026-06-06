"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Plan = {
  id: string;
  name: string;
  tagline: string;
  priceMonthly: number;
  maxActiveBookings: number;
  features?: string[];
  active?: boolean;
};

export function PlansManager({
  initialPlans,
  subscribers,
}: {
  initialPlans: Plan[];
  subscribers: Record<string, number>;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {initialPlans.map((p) => (
          <PlanRow key={p.id} plan={p} subCount={subscribers[p.id] ?? 0} onChanged={() => router.refresh()} />
        ))}
      </div>

      {creating ? (
        <NewPlanForm onDone={() => { setCreating(false); router.refresh(); }} onCancel={() => setCreating(false)} />
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="text-sm px-4 py-2 rounded-inner border border-line text-ink hover:bg-hover"
        >
          + New plan
        </button>
      )}
    </div>
  );
}

function PlanRow({ plan, subCount, onChanged }: { plan: Plan; subCount: number; onChanged: () => void }) {
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(plan.name);
  const [tagline, setTagline] = useState(plan.tagline);
  const [price, setPrice] = useState(String(plan.priceMonthly));
  const [cap, setCap] = useState(String(plan.maxActiveBookings));
  const [features, setFeatures] = useState((plan.features ?? []).join("\n"));
  const [apply, setApply] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true); setErr(null); setMsg(null);
    const res = await fetch(`/api/platform/plans/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        tagline,
        priceMonthly: Number(price) || 0,
        maxActiveBookings: Number(cap) || 0,
        features: features.split("\n").map((f) => f.trim()).filter(Boolean),
        applyToSubscribers: apply,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(typeof j.error === "string" ? j.error : "Could not save");
      return;
    }
    const j = await res.json();
    if (apply && j.updatedSubscribers) setMsg(`Updated cap for ${j.updatedSubscribers} firm(s).`);
    setEdit(false);
    onChanged();
  }

  async function toggleActive() {
    setBusy(true); setErr(null);
    const res = await fetch(`/api/platform/plans/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !plan.active }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(typeof j.error === "string" ? j.error : "Could not update");
      return;
    }
    onChanged();
  }

  return (
    <div className={`rounded-lg border p-4 ${plan.active === false ? "border-line bg-surface-2 opacity-70" : "border-line bg-surface"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-ink">{plan.name}</span>
            <code className="text-[11px] text-ink-faint">{plan.id}</code>
            {plan.active === false && <span className="text-[11px] text-high">retired</span>}
          </div>
          <div className="text-sm text-ink-muted">{plan.tagline}</div>
          <div className="text-xs text-ink-muted mt-1 tabular-nums">
            {plan.priceMonthly === 0 ? "Free" : `₹${plan.priceMonthly.toLocaleString("en-IN")}/mo`} ·{" "}
            {plan.maxActiveBookings} booking cap · {subCount} firm{subCount === 1 ? "" : "s"}
          </div>
        </div>
        {!edit && (
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setEdit(true)} className="text-xs px-3 py-1.5 rounded-inner border border-line hover:bg-hover">Edit</button>
            {plan.id !== "free" && (
              <button onClick={toggleActive} disabled={busy} className="text-xs px-3 py-1.5 rounded-inner border border-line text-ink-muted hover:text-ink">
                {plan.active === false ? "Restore" : "Retire"}
              </button>
            )}
          </div>
        )}
      </div>

      {msg && <div className="text-xs text-positive mt-2">{msg}</div>}
      {err && <div className="text-xs text-negative mt-2">{err}</div>}

      {edit && (
        <div className="mt-4 grid sm:grid-cols-2 gap-3 border-t border-line pt-4">
          <L label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className={inp} /></L>
          <L label="Tagline"><input value={tagline} onChange={(e) => setTagline(e.target.value)} className={inp} /></L>
          <L label="Price / month (₹)"><input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className={inp} /></L>
          <L label="Active booking cap"><input type="number" value={cap} onChange={(e) => setCap(e.target.value)} className={inp} /></L>
          <div className="sm:col-span-2">
            <L label="Features (one per line)">
              <textarea value={features} onChange={(e) => setFeatures(e.target.value)} rows={3} className={inp} />
            </L>
          </div>
          <label className="sm:col-span-2 flex items-center gap-2 text-xs text-ink-muted">
            <input type="checkbox" checked={apply} onChange={(e) => setApply(e.target.checked)} />
            Apply the new cap to all {subCount} firm(s) currently on this plan now
          </label>
          <div className="sm:col-span-2 flex gap-2">
            <button onClick={save} disabled={busy} className="text-sm px-4 py-2 rounded-inner bg-accent text-white disabled:opacity-50">
              {busy ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setEdit(false)} className="text-sm px-4 py-2 rounded-inner border border-line">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function NewPlanForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [price, setPrice] = useState("0");
  const [cap, setCap] = useState("1");
  const [features, setFeatures] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create() {
    setBusy(true); setErr(null);
    const res = await fetch("/api/platform/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: id.trim().toLowerCase(),
        name,
        tagline,
        priceMonthly: Number(price) || 0,
        maxActiveBookings: Number(cap) || 0,
        features: features.split("\n").map((f) => f.trim()).filter(Boolean),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(typeof j.error === "string" ? j.error : "Could not create");
      return;
    }
    onDone();
  }

  return (
    <div className="rounded-lg border border-accent/40 bg-accent/5 p-4 grid sm:grid-cols-2 gap-3">
      <L label="Plan id (slug)"><input value={id} onChange={(e) => setId(e.target.value)} placeholder="growth" className={inp} /></L>
      <L label="Name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Growth" className={inp} /></L>
      <L label="Tagline"><input value={tagline} onChange={(e) => setTagline(e.target.value)} className={inp} /></L>
      <L label="Price / month (₹)"><input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className={inp} /></L>
      <L label="Active booking cap"><input type="number" value={cap} onChange={(e) => setCap(e.target.value)} className={inp} /></L>
      <div className="sm:col-span-2">
        <L label="Features (one per line)"><textarea value={features} onChange={(e) => setFeatures(e.target.value)} rows={3} className={inp} /></L>
      </div>
      {err && <div className="sm:col-span-2 text-xs text-negative">{err}</div>}
      <div className="sm:col-span-2 flex gap-2">
        <button onClick={create} disabled={busy || !id || !name} className="text-sm px-4 py-2 rounded-inner bg-accent text-white disabled:opacity-50">
          {busy ? "Creating…" : "Create plan"}
        </button>
        <button onClick={onCancel} className="text-sm px-4 py-2 rounded-inner border border-line">Cancel</button>
      </div>
    </div>
  );
}

const inp = "w-full bg-surface-2 border border-line rounded-inner px-3 py-2 text-sm text-ink";

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-ink-muted mb-1">{label}</label>
      {children}
    </div>
  );
}
