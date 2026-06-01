"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { STAGE_LABELS, STAGE_COLORS, STAGE_ORDER } from "@/lib/leads";
import type { LeadStage } from "@prisma/client";

export type LeadCardData = {
  id: string;
  contactName: string;
  propertyTitle: string | null;
  stage: LeadStage;
  assignedToName: string | null;
  nextFollowupAt: string | null;
};

export function LeadBoard({ leads }: { leads: LeadCardData[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function setStage(id: string, stage: LeadStage) {
    setBusy(id);
    try {
      await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  function nextStage(s: LeadStage): LeadStage | null {
    const i = STAGE_ORDER.indexOf(s);
    if (i === -1 || i === STAGE_ORDER.length - 1) return null;
    return STAGE_ORDER[i + 1];
  }

  const now = Date.now();

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 md:grid md:grid-cols-4 md:overflow-visible">
      {STAGE_ORDER.map((stage) => {
        const col = leads.filter((l) => l.stage === stage);
        return (
          <div key={stage} className="min-w-[260px] md:min-w-0">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${STAGE_COLORS[stage]}`}>
                {STAGE_LABELS[stage]}
              </span>
              <span className="text-xs text-ink-faint">{col.length}</span>
            </div>
            <div className="space-y-2">
              {col.map((l) => {
                const overdue = l.nextFollowupAt && new Date(l.nextFollowupAt).getTime() < now;
                const next = nextStage(l.stage);
                return (
                  <div key={l.id} className="bg-surface border border-line rounded-inner p-3">
                    <Link href={`/leads/${l.id}`} className="block">
                      <div className="text-sm font-medium text-ink">{l.contactName}</div>
                      {l.propertyTitle && (
                        <div className="text-xs text-ink-muted truncate">{l.propertyTitle}</div>
                      )}
                      <div className="text-[11px] text-ink-faint mt-1 flex items-center gap-2">
                        {l.assignedToName && <span>{l.assignedToName}</span>}
                        {overdue && <span className="text-red-400">⏰ overdue</span>}
                      </div>
                    </Link>
                    <div className="flex gap-1 mt-2">
                      {next && (
                        <button
                          disabled={busy === l.id}
                          onClick={() => setStage(l.id, next)}
                          className="text-[11px] px-2 py-1 rounded border border-accent text-accent hover:bg-accent/10 disabled:opacity-40"
                        >
                          → {STAGE_LABELS[next]}
                        </button>
                      )}
                      {l.stage !== "lost" && (
                        <button
                          disabled={busy === l.id}
                          onClick={() => setStage(l.id, "lost")}
                          className="text-[11px] px-2 py-1 rounded border border-line text-ink-muted hover:bg-hover disabled:opacity-40"
                        >
                          Lost
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {col.length === 0 && <div className="text-xs text-ink-faint py-4 text-center">—</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
