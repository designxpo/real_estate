"use client";

import { useState } from "react";

type Validation = { ok: boolean; warnings: string[]; errors: string[] };
type Check = { portal: string; displayName: string; validation: Validation };
type Target = {
  portal: string;
  status: string;
  lastRefreshedAt: string | null;
  nextRefreshAt: string | null;
  refreshCount: number;
  refreshIntervalDays: number;
};

export function SyndicationPanel({
  propertyId,
  checks,
  initialTargets,
}: {
  propertyId: string;
  checks: Check[];
  initialTargets: Target[];
}) {
  const [targets, setTargets] = useState<Target[]>(initialTargets);
  const [busy, setBusy] = useState<string | null>(null);

  function targetFor(portal: string) {
    return targets.find((t) => t.portal === portal);
  }

  async function toggle(portal: string, enable: boolean) {
    setBusy(portal);
    try {
      const res = await fetch(`/api/properties/${propertyId}/targets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portal, enabled: enable }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.target) {
          setTargets((prev) => {
            const others = prev.filter((t) => t.portal !== portal);
            return [...others, data.target];
          });
        }
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="bg-surface rounded-lg border border-line p-4">
      <h2 className="text-sm font-medium text-ink-muted mb-3">Portal syndication</h2>
      <div className="space-y-2">
        {checks.map((c) => {
          const t = targetFor(c.portal);
          const enabled = !!t && t.status !== "disabled";
          return (
            <div
              key={c.portal}
              className="flex items-center justify-between gap-3 border border-line rounded-inner px-3 py-2"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-ink">{c.displayName}</div>
                {!c.validation.ok && (
                  <div className="text-xs text-red-400">{c.validation.errors.join(" · ")}</div>
                )}
                {c.validation.ok && c.validation.warnings.length > 0 && (
                  <div className="text-xs text-amber-400">{c.validation.warnings.join(" · ")}</div>
                )}
                {t && (
                  <div className="text-[11px] text-ink-faint">
                    {t.status}
                    {t.refreshCount > 0 ? ` · refreshed ${t.refreshCount}×` : ""}
                  </div>
                )}
              </div>
              <button
                disabled={busy === c.portal || (!enabled && !c.validation.ok)}
                onClick={() => toggle(c.portal, !enabled)}
                className={`shrink-0 text-xs px-3 py-1.5 rounded-inner border transition-colors disabled:opacity-40 ${
                  enabled
                    ? "border-line text-ink-muted hover:bg-hover"
                    : "border-accent text-accent hover:bg-accent/10"
                }`}
              >
                {busy === c.portal ? "…" : enabled ? "Disable" : "Enable"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
