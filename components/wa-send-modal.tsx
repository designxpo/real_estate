"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { renderTemplate } from "@/lib/whatsapp";

type Template = { id: string; name: string; category: string; bodyTemplate: string };

export function WaSendModal({
  contactId,
  contactName,
  optedIn,
  templates,
  leadId,
}: {
  contactId: string;
  contactName: string;
  optedIn: boolean;
  templates: Template[];
  leadId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [vars, setVars] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const template = templates.find((t) => t.id === templateId);
  const blocked = template?.category === "MARKETING" && !optedIn;

  async function send() {
    if (!template) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId, templateId: template.id, variables: vars, leadId }),
    });
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Send failed");
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-sm px-3 py-1.5 rounded-inner border border-emerald-500 text-emerald-300 hover:bg-emerald-500/10">
        WhatsApp
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-surface border border-line rounded-lg p-4 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold">Message {contactName}</h3>
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="w-full bg-surface-2 border border-line rounded-inner px-3 py-2 text-sm text-ink">
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
            </select>
            {template && (
              <div className="text-sm bg-app border border-line rounded-inner p-2 text-ink-muted">
                {renderTemplate(template.bodyTemplate, vars)}
              </div>
            )}
            <input
              placeholder="Variables, comma-separated"
              onChange={(e) => setVars(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              className="w-full bg-surface-2 border border-line rounded-inner px-3 py-2 text-sm text-ink"
            />
            {blocked && <div className="text-xs text-red-400">Contact hasn’t opted in to marketing messages.</div>}
            {error && <div className="text-xs text-red-400">{error}</div>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="text-sm px-3 py-1.5 rounded-inner border border-line text-ink-muted">Cancel</button>
              <button disabled={busy || blocked || !template} onClick={send} className="text-sm px-3 py-1.5 rounded-inner bg-accent text-white disabled:opacity-40">
                {busy ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
