"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Template = {
  id: string;
  name: string;
  language: string;
  category: string;
  bodyTemplate: string;
  status: string;
};

export function WaTemplateManager({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/whatsapp/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        language: fd.get("language") || "en",
        category: fd.get("category") || "MARKETING",
        bodyTemplate: fd.get("bodyTemplate"),
      }),
    });
    setBusy(false);
    if (res.ok) {
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } else {
      setError("Invalid template (name must be lowercase letters/numbers/underscores).");
    }
  }

  const input = "w-full bg-surface-2 border border-line rounded-inner px-3 py-2 text-sm text-ink";

  return (
    <div className="bg-surface border border-line rounded-lg p-4 space-y-3">
      <h2 className="font-semibold">Templates</h2>
      <div className="space-y-1">
        {templates.map((t) => (
          <div key={t.id} className="border border-line rounded-inner px-3 py-2">
            <div className="flex justify-between text-sm">
              <span className="font-mono text-ink">{t.name}</span>
              <span className="text-ink-faint text-xs">{t.category} · {t.language} · {t.status}</span>
            </div>
            <div className="text-xs text-ink-muted mt-1">{t.bodyTemplate}</div>
          </div>
        ))}
        {templates.length === 0 && <div className="text-sm text-ink-faint">No templates yet.</div>}
      </div>

      <form onSubmit={create} className="space-y-2 pt-2 border-t border-line">
        <input name="name" required placeholder="template_name" className={input} />
        <div className="flex gap-2">
          <select name="category" className={input}>
            <option value="MARKETING">MARKETING</option>
            <option value="UTILITY">UTILITY</option>
            <option value="AUTHENTICATION">AUTHENTICATION</option>
          </select>
          <input name="language" defaultValue="en" className={input} />
        </div>
        <textarea name="bodyTemplate" required rows={2} placeholder="Hello {{1}}, your visit for {{2}} is confirmed." className={input} />
        {error && <div className="text-sm text-red-400">{error}</div>}
        <button disabled={busy} className="text-sm px-3 py-1.5 rounded-inner bg-accent text-white disabled:opacity-50">Add template</button>
      </form>
    </div>
  );
}
