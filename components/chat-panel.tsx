"use client";

import { useEffect, useRef, useState } from "react";

type Message = { id: string; senderType: string; body: string; redacted?: boolean; createdAt: string };

// Slide-over chat with the owner about a listing (broker side). Polls while open
// so replies appear without a refresh. Contact details are redacted server-side.
export function ChatPanel({ listingId, title, onClose }: { listingId: string; title: string; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch(`/api/marketplace/listings/${listingId}/chat`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages);
    }
    setLoaded(true);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 4000); // light polling for live replies
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    const res = await fetch(`/api/marketplace/listings/${listingId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setBusy(false);
    if (res.ok) {
      const data = await res.json();
      setMessages((m) => [...m, data.message]);
      setText("");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md h-full bg-app border-l border-line flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-line flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-ink">Chat with owner</div>
            <div className="text-xs text-ink-muted truncate max-w-[260px]">{title}</div>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {!loaded ? (
            <div className="text-xs text-ink-faint text-center py-8">Loading…</div>
          ) : messages.length === 0 ? (
            <div className="text-xs text-ink-faint text-center py-8">
              Say hello to the owner. Phone numbers & links are hidden to keep the deal on-platform.
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.senderType === "broker";
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      mine ? "bg-accent text-white rounded-br-sm" : "bg-surface-2 text-ink rounded-bl-sm border border-line"
                    }`}
                  >
                    {m.body}
                    {m.redacted && (
                      <div className={`text-[10px] mt-1 ${mine ? "text-white/70" : "text-ink-faint"}`}>contact hidden</div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={send} className="p-3 border-t border-line flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 bg-surface-2 border border-line rounded-inner px-3 py-2 text-sm text-ink"
          />
          <button disabled={busy} className="text-sm px-4 py-2 rounded-inner bg-accent text-white disabled:opacity-50">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
