"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Plan = { id: string; name: string; maxActiveBookings: number; priceMonthly: number; tagline: string };

declare global {
  interface Window { Razorpay?: new (opts: unknown) => { open: () => void } }
}

function priceLabel(p: Plan) {
  return p.priceMonthly === 0 ? "Free" : `₹${p.priceMonthly.toLocaleString("en-IN")}`;
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function BillingPlans({
  plans,
  currentPlanId,
  configured,
}: {
  plans: Plan[];
  currentPlanId: string;
  configured: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currentPrice = plans.find((p) => p.id === currentPlanId)?.priceMonthly ?? 0;

  async function choose(plan: Plan) {
    setBusy(plan.id);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start checkout.");
        return;
      }
      if (data.activated) {
        router.refresh();
        return;
      }
      if (data.provider === "razorpay") {
        const ok = await loadRazorpay();
        if (!ok || !window.Razorpay) {
          setError("Could not load the payment window.");
          return;
        }
        const rzp = new window.Razorpay({
          key: data.keyId,
          order_id: data.order.id,
          amount: data.order.amount,
          currency: data.order.currency,
          name: "Marketplace subscription",
          description: `${data.plan.name} plan`,
          handler: () => {
            // Activation happens via webhook; give it a moment, then refresh.
            setTimeout(() => router.refresh(), 1500);
          },
        });
        rzp.open();
      }
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    if (!confirm("Downgrade to Free? You keep current bookings but can't start new ones beyond the Free cap.")) return;
    setBusy("cancel");
    await fetch("/api/billing/cancel", { method: "POST" });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {!configured && (
        <div className="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/30 rounded-inner px-3 py-2">
          Dev mode — no payment gateway configured, so upgrades activate instantly for testing.
          Add Razorpay keys to take real payments.
        </div>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {plans.map((p) => {
          const current = p.id === currentPlanId;
          const isDowngrade = p.priceMonthly < currentPrice;
          return (
            <div
              key={p.id}
              className={`rounded-lg border p-4 flex flex-col ${current ? "border-accent bg-accent/5" : "border-line bg-surface"}`}
            >
              <div className="text-sm font-semibold text-ink">{p.name}</div>
              <div className="text-xs text-ink-muted">{p.tagline}</div>
              <div className="mt-3">
                <span className="text-2xl font-semibold text-ink">{priceLabel(p)}</span>
                {p.priceMonthly > 0 && <span className="text-xs text-ink-muted">/mo</span>}
              </div>
              <div className="text-xs text-ink-muted mt-1">
                {p.maxActiveBookings} active booking{p.maxActiveBookings === 1 ? "" : "s"}
              </div>
              <div className="flex-1" />
              <div className="mt-4">
                {current ? (
                  <div className="text-xs text-center text-accent font-medium py-2">✓ Current plan</div>
                ) : (
                  <button
                    onClick={() => choose(p)}
                    disabled={busy !== null}
                    className={`w-full text-sm px-3 py-2 rounded-inner disabled:opacity-50 ${
                      isDowngrade ? "border border-line text-ink-muted hover:text-ink" : "bg-accent text-white"
                    }`}
                  >
                    {busy === p.id ? "…" : isDowngrade ? "Switch" : `Upgrade to ${p.name}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {error && <div className="text-sm text-red-500">{error}</div>}
      {currentPlanId !== "free" && (
        <button onClick={cancel} disabled={busy !== null} className="text-xs text-ink-muted hover:text-red-500">
          Cancel subscription (downgrade to Free)
        </button>
      )}
    </div>
  );
}
