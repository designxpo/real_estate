"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Option = { id: string; label: string };

export function NewLeadForm({
  contacts,
  properties,
}: {
  contacts: Option[];
  properties: Option[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"existing" | "new">(contacts.length ? "existing" : "new");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      propertyId: fd.get("propertyId") || "",
      intent: fd.get("intent") || undefined,
      requirementsText: fd.get("requirementsText") || undefined,
      source: fd.get("source") || "other",
    };
    if (mode === "existing") payload.contactId = fd.get("contactId");
    else {
      payload.contactName = fd.get("contactName");
      payload.contactPhone = fd.get("contactPhone");
    }
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      const { lead } = await res.json();
      router.push(`/leads/${lead.id}`);
      router.refresh();
    } else {
      setError("Could not create lead. Check the fields.");
    }
  }

  const inputCls = "w-full bg-surface-2 border border-line rounded-inner px-3 py-2 text-sm text-ink";

  return (
    <form onSubmit={submit} className="space-y-4 max-w-lg">
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode("existing")} className={`text-xs px-3 py-1.5 rounded-inner border ${mode === "existing" ? "border-accent text-accent" : "border-line text-ink-muted"}`}>
          Existing contact
        </button>
        <button type="button" onClick={() => setMode("new")} className={`text-xs px-3 py-1.5 rounded-inner border ${mode === "new" ? "border-accent text-accent" : "border-line text-ink-muted"}`}>
          New contact
        </button>
      </div>

      {mode === "existing" ? (
        <select name="contactId" required className={inputCls}>
          <option value="">Select a contact…</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      ) : (
        <div className="space-y-2">
          <input name="contactName" required placeholder="Contact name" className={inputCls} />
          <input name="contactPhone" required placeholder="Phone" className={inputCls} />
        </div>
      )}

      <select name="propertyId" className={inputCls}>
        <option value="">Link a property (optional)…</option>
        {properties.map((p) => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </select>

      <select name="intent" className={inputCls}>
        <option value="">Intent…</option>
        <option value="buy">Buy</option>
        <option value="rent">Rent</option>
        <option value="invest">Invest</option>
      </select>

      <textarea name="requirementsText" rows={3} placeholder="Requirements / notes" className={inputCls} />
      <input type="hidden" name="source" value="walkin" />

      {error && <div className="text-sm text-red-400">{error}</div>}
      <button disabled={saving} className="px-4 py-2 rounded-inner bg-accent text-white text-sm disabled:opacity-50">
        {saving ? "Creating…" : "Create lead"}
      </button>
    </form>
  );
}
