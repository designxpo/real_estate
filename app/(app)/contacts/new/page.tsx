"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewContactPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name"),
      phone: fd.get("phone"),
      email: fd.get("email") || undefined,
      type: fd.get("type"),
      source: fd.get("source"),
      notes: fd.get("notes") || undefined,
      tags: String(fd.get("tags") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(typeof j.error === "string" ? j.error : "Could not create contact");
      return;
    }
    router.push("/contacts");
    router.refresh();
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold mb-4">New contact</h1>
      {err && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-3">{err}</div>
      )}
      <form onSubmit={onSubmit} className="bg-surface rounded-lg border border-line p-4 sm:p-6 space-y-4">
        <Field label="Name" name="name" required />
        <Field label="Phone" name="phone" required placeholder="+91 98xxx xxx00" />
        <Field label="Email" name="email" type="email" />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Type" name="type">
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
            <option value="tenant">Tenant</option>
            <option value="landlord">Landlord</option>
            <option value="other">Other</option>
          </Select>
          <Select label="Source" name="source">
            <option value="walkin">Walk-in</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="referral">Referral</option>
            <option value="ninetynine_acres">99acres</option>
            <option value="magicbricks">MagicBricks</option>
            <option value="housing">Housing</option>
            <option value="other">Other</option>
          </Select>
        </div>
        <Field label="Tags (comma-separated)" name="tags" placeholder="HNI, NRI, urgent" />
        <Field label="Notes" name="notes" textarea />
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-brand text-white px-4 py-2 font-medium disabled:opacity-50"
        >
          {busy ? "Saving…" : "Create contact"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  textarea,
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
  textarea?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement> &
  React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      {textarea ? (
        <textarea
          name={name}
          {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          rows={3}
          className="mt-1 w-full rounded-md border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-accent"
        />
      ) : (
        <input
          name={name}
          type={type}
          {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
          className="mt-1 w-full rounded-md border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-accent"
        />
      )}
    </label>
  );
}

function Select({
  label,
  name,
  children,
}: {
  label: string;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <select
        name={name}
        className="mt-1 w-full rounded-md border border-line px-3 py-2 bg-surface focus:outline-none focus:ring-2 focus:ring-brand-accent"
      >
        {children}
      </select>
    </label>
  );
}
