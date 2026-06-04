"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const SEGMENTS = [
  ["tenants", "Tenants"],
  ["leads", "Leads"],
  ["team", "Sub-brokers"],
] as const;
const LEAD_STAGES = ["", "new", "contacted", "site_visit_scheduled", "visited", "negotiating", "token", "agreement"];
const TAGS = ["name", "unit", "rentDue", "firm"];

function merge(body: string, vars: Record<string, string>) {
  return body.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

export function BroadcastComposer() {
  const router = useRouter();
  const [segment, setSegment] = useState<"tenants" | "leads" | "team">("tenants");
  const [filter, setFilter] = useState("");
  const [channel, setChannel] = useState("whatsapp");
  const [body, setBody] = useState("Hi {name}, this is a message from {firm}.");
  const [info, setInfo] = useState<{ count: number; optedOut: number; sample: Record<string, string> } | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancel = false;
    const qs = new URLSearchParams({ segment, ...(filter ? { filter } : {}) });
    fetch(`/api/broadcast/count?${qs}`)
      .then((r) => r.json())
      .then((d) => { if (!cancel) setInfo(d); })
      .catch(() => {});
    return () => { cancel = true; };
  }, [segment, filter]);

  function insertTag(tag: string) {
    const ta = taRef.current;
    const ins = `{${tag}}`;
    if (!ta) { setBody((b) => b + ins); return; }
    const start = ta.selectionStart, end = ta.selectionEnd;
    setBody((b) => b.slice(0, start) + ins + b.slice(end));
  }

  async function send() {
    if (!body.trim() || !info?.count) return;
    if (!confirm(`Send to ${info.count} recipient${info.count === 1 ? "" : "s"} via ${channel}?`)) return;
    setBusy(true); setResult(null);
    const res = await fetch("/api/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segment, filter: filter || undefined, channel, body }),
    });
    setBusy(false);
    if (res.ok) {
      const d = await res.json();
      setResult(`Done — ${d.sent} sent, ${d.queued} queued, ${d.skipped} skipped (opt-out).`);
      router.refresh();
    } else {
      setResult("Could not send. Try again.");
    }
  }

  const sample = info?.sample ?? { name: "Tenant", firm: "Your firm", unit: "A-302", rentDue: "₹22,000" };

  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-5">
      <div className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-ink-muted mb-1">Segment</label>
            <select value={segment} onChange={(e) => { setSegment(e.target.value as typeof segment); setFilter(""); }} className="w-full bg-surface-2 border border-line rounded-inner px-3 py-2 text-sm text-ink">
              {SEGMENTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {segment === "tenants" && (
            <div>
              <label className="block text-xs text-ink-muted mb-1">Building (optional)</label>
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="All buildings" className="w-full bg-surface-2 border border-line rounded-inner px-3 py-2 text-sm text-ink" />
            </div>
          )}
          {segment === "leads" && (
            <div>
              <label className="block text-xs text-ink-muted mb-1">Stage (optional)</label>
              <select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-full bg-surface-2 border border-line rounded-inner px-3 py-2 text-sm text-ink">
                {LEAD_STAGES.map((s) => <option key={s || "any"} value={s}>{s ? s.replace(/_/g, " ") : "Any stage"}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-ink-muted mb-1">Channel</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value)} className="w-full bg-surface-2 border border-line rounded-inner px-3 py-2 text-sm text-ink">
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-ink-muted">Message</label>
            <div className="flex gap-1">
              {TAGS.map((t) => (
                <button key={t} onClick={() => insertTag(t)} className="text-[11px] px-2 py-0.5 rounded-full bg-accent-soft text-accent">{`{${t}}`}</button>
              ))}
            </div>
          </div>
          <textarea ref={taRef} value={body} onChange={(e) => setBody(e.target.value)} rows={5} className="w-full bg-surface-2 border border-line rounded-inner px-3 py-2 text-sm text-ink" />
        </div>

        {result && <div className="text-sm text-positive bg-positive/10 border border-positive/30 rounded-inner px-3 py-2">{result}</div>}

        <button onClick={send} disabled={busy || !info?.count} className="text-sm px-5 py-2.5 rounded-inner bg-accent text-white disabled:opacity-50">
          {busy ? "Sending…" : `Send to ${info?.count ?? 0} recipient${info?.count === 1 ? "" : "s"}`}
        </button>
      </div>

      {/* Preview + audience */}
      <aside className="space-y-3">
        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="text-xs text-ink-muted">Audience</div>
          <div className="text-2xl font-semibold text-ink tabular-nums">{info?.count ?? "…"}</div>
          {channel === "whatsapp" && info && info.optedOut > 0 && (
            <div className="text-xs text-high mt-1">{info.optedOut} opted out — will be skipped</div>
          )}
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="text-xs text-ink-muted mb-2">Preview (first recipient)</div>
          <div className="text-sm text-ink whitespace-pre-wrap bg-surface-2 rounded-inner p-3 min-h-[80px]">{merge(body, sample)}</div>
        </div>
        <p className="text-[11px] text-ink-faint">
          WhatsApp proactive messages require an approved template + opt-in. Without channel keys, recipients are recorded as “queued”.
        </p>
      </aside>
    </div>
  );
}
