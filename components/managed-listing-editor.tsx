"use client";

import { useState } from "react";

type Activity = {
  id: string;
  actorType: string;
  actorName: string;
  action: string;
  detail: string | null;
  createdAt: string;
};

type Listing = {
  id: string;
  title: string;
  description: string | null;
  bhk: number | null;
  price: { amount: number | null; unit: string; negotiable: boolean };
  maintenanceAmount: number | null;
  depositMonths: number | null;
  location: { locality: string | null; city: string; state: string | null };
  furnishing: string | null;
  status: string;
  moderation: string;
  managedBy: { firmName: string; brokerName: string | null } | null;
  activity: Activity[];
};

const inputCls = "bg-surface-2 border border-line rounded-inner px-3 py-2 text-sm text-ink w-full";
const labelCls = "block text-xs text-ink-muted mb-1";

const STATUSES = ["active", "booked", "inactive", "draft"] as const;

function ago(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function ManagedListingEditor({ initial }: { initial: Listing }) {
  const [l, setL] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>, successMsg: string) {
    setBusy(true);
    setMsg(null);
    setError(null);
    const res = await fetch(`/api/marketplace/managed-listings/${l.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (res.ok) {
      setL(await res.json());
      setMsg(successMsg);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Update failed.");
    }
  }

  async function saveDetails(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const numOrUndef = (k: string) => {
      const v = f.get(k);
      return v === null || v === "" ? undefined : Number(v);
    };
    await patch(
      {
        title: f.get("title"),
        description: f.get("description") || undefined,
        bhk: numOrUndef("bhk"),
        priceAmount: numOrUndef("priceAmount"),
        priceUnit: f.get("priceUnit"),
        negotiable: f.get("negotiable") === "on",
        maintenanceAmount: numOrUndef("maintenanceAmount"),
        depositMonths: numOrUndef("depositMonths"),
        locality: f.get("locality") || undefined,
        city: f.get("city"),
        state: f.get("state") || undefined,
        furnishing: f.get("furnishing") || undefined,
      },
      "Saved — the owner sees this update in their app.",
    );
  }

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      <div className="space-y-6">
        {/* Status */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-ink">Status</h2>
          <p className="text-xs text-ink-muted">
            Brokers see this instantly in the marketplace; the owner sees it in their app.
          </p>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                disabled={busy || s === l.status}
                onClick={() => patch({ status: s }, `Status set to ${s}.`)}
                className={`text-sm px-4 py-1.5 rounded-full border transition-colors disabled:cursor-default ${
                  s === l.status
                    ? "bg-accent text-white border-accent"
                    : "border-line text-ink-muted hover:text-ink hover:border-accent/60"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        {/* Details */}
        <form onSubmit={saveDetails} className="space-y-3">
          <h2 className="text-sm font-semibold text-ink">Details</h2>
          <div>
            <label className={labelCls}>Title</label>
            <input name="title" defaultValue={l.title} required minLength={3} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea name="description" rows={3} defaultValue={l.description ?? ""} className={inputCls} />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Price</label>
              <input name="priceAmount" type="number" step="any" min={0} defaultValue={l.price.amount ?? ""} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Unit</label>
              <select name="priceUnit" defaultValue={l.price.unit} className={inputCls}>
                <option value="lakh">Lakh</option>
                <option value="crore">Crore</option>
                <option value="per_month">Per month</option>
                <option value="per_sqft">Per sqft</option>
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input name="negotiable" type="checkbox" defaultChecked={l.price.negotiable} /> Negotiable
              </label>
            </div>
            <div>
              <label className={labelCls}>BHK</label>
              <input name="bhk" type="number" min={0} defaultValue={l.bhk ?? ""} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Maintenance (₹)</label>
              <input name="maintenanceAmount" type="number" min={0} defaultValue={l.maintenanceAmount ?? ""} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Deposit (months)</label>
              <input name="depositMonths" type="number" min={0} defaultValue={l.depositMonths ?? ""} className={inputCls} />
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Locality</label>
              <input name="locality" defaultValue={l.location.locality ?? ""} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>City</label>
              <input name="city" required defaultValue={l.location.city} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>State</label>
              <input name="state" defaultValue={l.location.state ?? ""} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Furnishing</label>
              <select name="furnishing" defaultValue={l.furnishing ?? ""} className={inputCls}>
                <option value="">—</option>
                <option value="unfurnished">Unfurnished</option>
                <option value="semi">Semi</option>
                <option value="fully">Fully</option>
              </select>
            </div>
          </div>
          {msg && <div className="text-sm text-green-600">{msg}</div>}
          {error && <div className="text-sm text-red-500">{error}</div>}
          <button type="submit" disabled={busy} className="text-sm px-5 py-2 rounded-inner bg-accent text-white disabled:opacity-60">
            {busy ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>

      {/* Activity log */}
      <aside className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">Activity log</h2>
        <p className="text-xs text-ink-muted">Shared with the owner — both sides see every change.</p>
        <ol className="space-y-2">
          {l.activity.length === 0 && <li className="text-xs text-ink-faint">No activity yet.</li>}
          {l.activity.map((a) => (
            <li key={a.id} className="bg-surface-2 border border-line rounded-inner p-3">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    a.actorType === "broker" ? "bg-blue-500/15 text-blue-600" : "bg-orange-500/15 text-orange-600"
                  }`}
                >
                  {a.actorType === "broker" ? "Broker" : "Owner"}
                </span>
                <span className="text-[11px] text-ink-faint">{ago(a.createdAt)}</span>
              </div>
              <div className="text-sm text-ink">{a.detail ?? a.action}</div>
              <div className="text-[11px] text-ink-faint mt-0.5">{a.actorName}</div>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
