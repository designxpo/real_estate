"use client";

import { useState } from "react";

export function RequestVisitForm({ slug }: { slug: string }) {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/p/${slug}/request-visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        phone: fd.get("phone"),
        message: fd.get("message") || undefined,
      }),
    });
    setBusy(false);
    if (res.ok) setDone(true);
    else setError("Could not send. Please try again.");
  }

  if (done) {
    return (
      <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-700">
        Thanks! The broker will reach out shortly.
      </div>
    );
  }

  const input = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm";

  return (
    <form onSubmit={submit} className="space-y-2">
      <input name="name" required placeholder="Your name" className={input} />
      <input name="phone" required placeholder="Phone number" className={input} />
      <textarea name="message" rows={2} placeholder="Message (optional)" className={input} />
      {error && <div className="text-sm text-red-600">{error}</div>}
      <button disabled={busy} className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50">
        {busy ? "Sending…" : "Request a visit"}
      </button>
    </form>
  );
}
