"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Option = { id: string; label: string };

export function NewDealForm({
  properties,
  contacts,
  prefill,
}: {
  properties: Option[];
  contacts: Option[];
  prefill?: { propertyId?: string; buyerContactId?: string; leadId?: string };
}) {
  const router = useRouter();
  const [dealType, setDealType] = useState<"sale" | "rent" | "lease">("sale");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      propertyId: fd.get("propertyId"),
      buyerContactId: fd.get("buyerContactId"),
      sellerContactId: fd.get("sellerContactId") || "",
      dealType,
      agreedPrice: Number(fd.get("agreedPrice")),
      leadId: prefill?.leadId || "",
      notes: fd.get("notes") || undefined,
    };
    if (dealType === "rent") {
      payload.rentMonthsBuyerSide = Number(fd.get("rentMonthsBuyerSide")) || 0;
      payload.rentMonthsSellerSide = Number(fd.get("rentMonthsSellerSide")) || 0;
    } else {
      payload.brokeragePctBuyerSide = Number(fd.get("brokeragePctBuyerSide")) || 0;
      payload.brokeragePctSellerSide = Number(fd.get("brokeragePctSellerSide")) || 0;
    }
    const res = await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      const { deal } = await res.json();
      router.push(`/deals/${deal.id}`);
      router.refresh();
    } else {
      setError("Could not create deal. Check the fields.");
    }
  }

  const input = "w-full bg-surface-2 border border-line rounded-inner px-3 py-2 text-sm text-ink";

  return (
    <form onSubmit={submit} className="space-y-4 max-w-lg">
      <select name="propertyId" required defaultValue={prefill?.propertyId ?? ""} className={input}>
        <option value="">Select property…</option>
        {properties.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>
      <select name="buyerContactId" required defaultValue={prefill?.buyerContactId ?? ""} className={input}>
        <option value="">Buyer / tenant…</option>
        {contacts.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
      <select name="sellerContactId" className={input}>
        <option value="">Seller / landlord (optional)…</option>
        {contacts.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>

      <div className="flex gap-2">
        {(["sale", "rent", "lease"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setDealType(t)} className={`text-xs px-3 py-1.5 rounded-inner border capitalize ${dealType === t ? "border-accent text-accent" : "border-line text-ink-muted"}`}>
            {t}
          </button>
        ))}
      </div>

      <input name="agreedPrice" type="number" step="0.01" required placeholder={dealType === "rent" ? "Monthly rent ₹" : "Agreed price ₹"} className={input} />

      {dealType === "rent" ? (
        <div className="flex gap-2">
          <input name="rentMonthsBuyerSide" type="number" step="0.5" placeholder="Buyer-side months" className={input} />
          <input name="rentMonthsSellerSide" type="number" step="0.5" placeholder="Seller-side months" className={input} />
        </div>
      ) : (
        <div className="flex gap-2">
          <input name="brokeragePctBuyerSide" type="number" step="0.01" placeholder="Buyer-side %" className={input} />
          <input name="brokeragePctSellerSide" type="number" step="0.01" placeholder="Seller-side %" className={input} />
        </div>
      )}

      <textarea name="notes" rows={2} placeholder="Notes" className={input} />
      {error && <div className="text-sm text-red-400">{error}</div>}
      <button disabled={saving} className="px-4 py-2 rounded-inner bg-accent text-white text-sm disabled:opacity-50">
        {saving ? "Creating…" : "Create deal"}
      </button>
    </form>
  );
}
