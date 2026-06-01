"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Subscribes to the marketplace SSE stream and refreshes the page (server
// component re-query) whenever an owner changes a listing's status. Shows a
// small "Live" indicator. Mount once on the /marketplace page.
export function MarketplaceLive() {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const lastRefresh = useRef(0);

  useEffect(() => {
    const es = new EventSource("/api/marketplace/stream");
    es.addEventListener("ping", () => setConnected(true));
    es.addEventListener("change", () => {
      // Debounce bursts of changes into one refresh.
      const now = Date.now();
      if (now - lastRefresh.current > 600) {
        lastRefresh.current = now;
        router.refresh();
      }
    });
    es.onerror = () => setConnected(false);
    return () => es.close();
  }, [router]);

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-faint">
      <span
        className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-ink-faint/40"}`}
      />
      {connected ? "Live" : "Connecting…"}
    </span>
  );
}
