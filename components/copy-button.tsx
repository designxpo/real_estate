"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button
      onClick={copy}
      className="shrink-0 text-xs px-2.5 py-1.5 rounded-inner border border-line text-ink-muted hover:text-ink hover:bg-hover transition-colors"
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
