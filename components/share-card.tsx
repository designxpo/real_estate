"use client";

import { useState } from "react";

export function ShareCard({
  shareText,
  publicUrl,
}: {
  shareText: string;
  publicUrl: string | null;
}) {
  const [copiedText, setCopiedText] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  async function copy(value: string, which: "text" | "url") {
    try {
      await navigator.clipboard.writeText(value);
      if (which === "text") {
        setCopiedText(true);
        setTimeout(() => setCopiedText(false), 1500);
      } else {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 1500);
      }
    } catch {
      /* ignore */
    }
  }

  const waHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="bg-surface rounded-lg border border-line p-4 space-y-3">
      <h2 className="text-sm font-medium text-ink-muted">Share this listing</h2>
      <pre className="whitespace-pre-wrap text-sm bg-app border border-line rounded-inner p-3 text-ink max-h-48 overflow-y-auto">
        {shareText}
      </pre>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => copy(shareText, "text")}
          className="text-xs px-3 py-1.5 rounded-inner border border-line text-ink-muted hover:text-ink hover:bg-hover"
        >
          {copiedText ? "Copied ✓" : "Copy text"}
        </button>
        {publicUrl && (
          <button
            onClick={() => copy(publicUrl, "url")}
            className="text-xs px-3 py-1.5 rounded-inner border border-line text-ink-muted hover:text-ink hover:bg-hover"
          >
            {copiedUrl ? "Copied ✓" : "Copy link"}
          </button>
        )}
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-3 py-1.5 rounded-inner bg-emerald-600 text-white hover:bg-emerald-500"
        >
          Send via WhatsApp
        </a>
      </div>
    </div>
  );
}
