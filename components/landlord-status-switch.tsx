"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PropertyView = {
  id: string;
  title: string;
  rent: string;
  address: string;
  status: string; // PropertyStatus
  statusLabel: string;
  firmName: string;
};

// The single-purpose landlord control: confirm a pending listing, then toggle
// Active <-> Booked. Deliberately not a dashboard.
export function LandlordStatusSwitch({ property }: { property: PropertyView }) {
  const router = useRouter();
  const [status, setStatus] = useState(property.status);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function setTo(target: "active" | "booked") {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/properties/${property.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: target }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(typeof j.error === "string" ? j.error : "Could not update. Please try again.");
      return;
    }
    setStatus(target);
    setSavedAt(Date.now());
    router.refresh();
  }

  const isPending = status === "pending";
  const isActive = status === "active";
  const isBooked = status === "booked";
  const isInactive = status === "inactive" || status === "withdrawn" || status === "closed";

  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-card space-y-4">
      <div>
        <div className="text-xs uppercase tracking-wider text-ink-faint">{property.firmName}</div>
        <h2 className="text-lg font-semibold mt-0.5">{property.title}</h2>
        <div className="text-sm text-ink-muted">{property.address}</div>
        <div className="text-accent-glow font-semibold mt-1 tabular-nums">{property.rent}</div>
      </div>

      {err && (
        <div className="text-sm text-negative bg-negative/10 border border-negative/20 rounded-inner px-3 py-2">
          {err}
        </div>
      )}

      {isInactive ? (
        <div className="text-sm text-ink-muted bg-fill rounded-inner px-3 py-2">
          This listing is currently inactive. Please contact your broker to re-list it.
        </div>
      ) : isPending ? (
        <div className="space-y-3">
          <p className="text-sm text-ink-muted">
            Your broker has prepared this listing. Confirm to make it{" "}
            <span className="text-positive font-medium">Active</span> so they can start finding
            tenants.
          </p>
          <button
            onClick={() => setTo("active")}
            disabled={busy}
            className="w-full h-12 rounded-full bg-positive text-white font-medium disabled:opacity-50"
          >
            {busy ? "Confirming…" : "✓ Confirm & make Active"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* The core toggle */}
          <div className="flex items-center gap-2 p-1 rounded-full bg-surface-2 border border-line">
            <button
              onClick={() => !isActive && setTo("active")}
              disabled={busy || isActive}
              className={
                "flex-1 h-10 rounded-full text-sm font-medium transition-colors " +
                (isActive ? "bg-positive text-white" : "text-ink-muted hover:text-ink disabled:opacity-100")
              }
            >
              ● Active
            </button>
            <button
              onClick={() => !isBooked && setTo("booked")}
              disabled={busy || isBooked}
              className={
                "flex-1 h-10 rounded-full text-sm font-medium transition-colors " +
                (isBooked ? "bg-warn text-white" : "text-ink-muted hover:text-ink")
              }
            >
              ◆ Booked
            </button>
          </div>
          <p className="text-xs text-ink-faint text-center">
            {isActive
              ? "Your property is visible and your broker is sharing it with buyers."
              : "Marked booked — the public listing is paused. Switch back to Active anytime."}
          </p>
        </div>
      )}

      {savedAt && !err && (
        <div className="text-xs text-positive text-center">✓ Saved</div>
      )}
    </div>
  );
}
