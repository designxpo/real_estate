"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Body = Record<string, unknown>;

export function FirmActions({
  firmId,
  currentPlanId,
  currentCap,
  verificationStatus,
  suspended,
  plans,
}: {
  firmId: string;
  currentPlanId: string;
  currentCap: number;
  verificationStatus: string;
  suspended: boolean;
  plans: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [planId, setPlanId] = useState(currentPlanId);
  const [cap, setCap] = useState(String(currentCap));
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function patch(key: string, body: Body, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(key); setErr(null);
    const res = await fetch(`/api/platform/firms/${firmId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(typeof j.error === "string" ? j.error : "Action failed");
      return;
    }
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-line bg-surface p-4 space-y-4">
      <h2 className="font-semibold">Operator actions</h2>
      {err && <div className="text-sm text-negative bg-negative/10 border border-negative/20 rounded-inner px-3 py-2">{err}</div>}

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Plan */}
        <div className="space-y-2">
          <label className="block text-xs text-ink-muted">Subscription plan</label>
          <div className="flex gap-2">
            <select value={planId} onChange={(e) => setPlanId(e.target.value)} className="flex-1 bg-surface-2 border border-line rounded-inner px-3 py-2 text-sm text-ink">
              {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button
              onClick={() => patch("plan", { action: "set_plan", planId })}
              disabled={busy !== null || planId === currentPlanId}
              className="text-sm px-3 py-2 rounded-inner bg-accent text-white disabled:opacity-50"
            >
              {busy === "plan" ? "…" : "Set"}
            </button>
          </div>
          <p className="text-[11px] text-ink-faint">Sets plan + resets booking cap to the plan default.</p>
        </div>

        {/* Cap override */}
        <div className="space-y-2">
          <label className="block text-xs text-ink-muted">Override booking cap</label>
          <div className="flex gap-2">
            <input type="number" value={cap} onChange={(e) => setCap(e.target.value)} className="flex-1 bg-surface-2 border border-line rounded-inner px-3 py-2 text-sm text-ink" />
            <button
              onClick={() => patch("cap", { action: "override_cap", maxActiveBookings: Number(cap) || 0 })}
              disabled={busy !== null || Number(cap) === currentCap}
              className="text-sm px-3 py-2 rounded-inner bg-accent text-white disabled:opacity-50"
            >
              {busy === "cap" ? "…" : "Apply"}
            </button>
          </div>
          <p className="text-[11px] text-ink-faint">Custom cap without changing the plan (e.g. a one-off concession).</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-line">
        {verificationStatus !== "verified" && (
          <button onClick={() => patch("verify", { action: "set_verification", status: "verified" })} disabled={busy !== null}
            className="text-sm px-3 py-1.5 rounded-inner border border-positive/40 text-positive hover:bg-positive/10">
            ✓ Mark verified
          </button>
        )}
        {verificationStatus === "verified" && (
          <button onClick={() => patch("unverify", { action: "set_verification", status: "pending" })} disabled={busy !== null}
            className="text-sm px-3 py-1.5 rounded-inner border border-line text-ink-muted hover:text-ink">
            Revoke verification
          </button>
        )}
        {verificationStatus !== "rejected" && (
          <button onClick={() => patch("reject", { action: "set_verification", status: "rejected" }, "Reject this firm's verification?")} disabled={busy !== null}
            className="text-sm px-3 py-1.5 rounded-inner border border-line text-ink-muted hover:text-ink">
            Reject
          </button>
        )}
        {suspended ? (
          <button onClick={() => patch("unsuspend", { action: "set_suspended", suspended: false })} disabled={busy !== null}
            className="text-sm px-3 py-1.5 rounded-inner border border-positive/40 text-positive hover:bg-positive/10">
            Unsuspend firm
          </button>
        ) : (
          <button onClick={() => patch("suspend", { action: "set_suspended", suspended: true }, "Suspend this firm? Its brokers will be locked out until you unsuspend.")} disabled={busy !== null}
            className="text-sm px-3 py-1.5 rounded-inner border border-negative/40 text-negative hover:bg-negative/10">
            Suspend firm
          </button>
        )}
      </div>
    </section>
  );
}
