"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEAL_STAGE_LABELS, DEAL_STAGE_ORDER } from "@/lib/deals";
import type { DealStage } from "@prisma/client";

export function DealActions({ dealId, stage }: { dealId: string; stage: DealStage }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function patch(data: Record<string, unknown>) {
    setBusy(true);
    try {
      await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const i = DEAL_STAGE_ORDER.indexOf(stage);
  const next = i >= 0 && i < DEAL_STAGE_ORDER.length - 1 ? DEAL_STAGE_ORDER[i + 1] : null;

  return (
    <div className="flex flex-wrap gap-2">
      {next && (
        <button disabled={busy} onClick={() => patch({ stage: next })} className="text-sm px-3 py-1.5 rounded-inner bg-accent text-white disabled:opacity-50">
          Advance → {DEAL_STAGE_LABELS[next]}
        </button>
      )}
      {stage !== "cancelled" && stage !== "completed" && (
        <button disabled={busy} onClick={() => patch({ stage: "cancelled", cancelledReason: "Cancelled" })} className="text-sm px-3 py-1.5 rounded-inner border border-line text-ink-muted hover:bg-hover disabled:opacity-50">
          Cancel deal
        </button>
      )}
    </div>
  );
}
