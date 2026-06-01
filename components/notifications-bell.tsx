"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export function NotificationsBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications ?? []);
      setUnread(data.unread ?? 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  async function markAll() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    load();
  }

  async function openItem(n: Notification) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: n.id }),
    });
    setOpen(false);
    if (n.href) router.push(n.href);
    else load();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((x) => !x)}
        className="relative w-8 h-8 rounded-full hover:bg-hover text-ink-muted text-lg flex items-center justify-center"
        aria-label="Notifications"
      >
        ◔
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto z-50 bg-surface border border-line rounded-lg shadow-xl">
            <div className="flex items-center justify-between px-3 py-2 border-b border-line">
              <span className="text-sm font-semibold text-ink">Notifications</span>
              {unread > 0 && (
                <button onClick={markAll} className="text-xs text-accent hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-ink-faint">No notifications</div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className={`w-full text-left px-3 py-2.5 border-b border-line/50 hover:bg-hover ${
                    n.readAt ? "opacity-60" : ""
                  }`}
                >
                  <div className="text-sm font-medium text-ink">{n.title}</div>
                  {n.body && <div className="text-xs text-ink-muted mt-0.5">{n.body}</div>}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
