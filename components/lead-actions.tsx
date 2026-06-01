"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/leads";
import type { LeadStage } from "@prisma/client";

export function LeadActions({ leadId, stage }: { leadId: string; stage: LeadStage }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function patch(data: Record<string, unknown>) {
    setBusy(true);
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const i = STAGE_ORDER.indexOf(stage);
  const next = i >= 0 && i < STAGE_ORDER.length - 1 ? STAGE_ORDER[i + 1] : null;

  return (
    <div className="flex flex-wrap gap-2">
      {next && (
        <button disabled={busy} onClick={() => patch({ stage: next })} className="text-sm px-3 py-1.5 rounded-inner bg-accent text-white disabled:opacity-50">
          Advance → {STAGE_LABELS[next]}
        </button>
      )}
      {stage !== "lost" && (
        <button disabled={busy} onClick={() => patch({ stage: "lost", lostReason: "Marked lost" })} className="text-sm px-3 py-1.5 rounded-inner border border-line text-ink-muted hover:bg-hover disabled:opacity-50">
          Mark lost
        </button>
      )}
    </div>
  );
}
