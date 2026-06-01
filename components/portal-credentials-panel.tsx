"use client";

import { useEffect, useState, useCallback } from "react";

type CredRow = {
  portal: string;
  displayName: string;
  hasApiKey: boolean;
  brokerCode: string | null;
  lastUsedAt: string | null;
};

export function PortalCredentialsPanel() {
  const [rows, setRows] = useState<CredRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/firms/portal-credentials");
      if (res.ok) {
        const data = await res.json();
        setRows(data.credentials ?? data.rows ?? []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="bg-surface rounded-lg border border-line p-4">
      <h2 className="font-semibold mb-1">Portal API credentials</h2>
      <p className="text-sm text-ink-muted mb-3">
        Stored encrypted (AES-256-GCM). Only owners/principals can manage these.
      </p>
      {loading ? (
        <div className="text-sm text-ink-faint">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-ink-faint">No portal credentials configured yet.</div>
      ) : (
        <div className="rounded-inner border border-line divide-y divide-line">
          {rows.map((r) => (
            <div key={r.portal} className="p-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-ink">{r.displayName}</div>
                <div className="text-xs text-ink-faint">
                  {r.hasApiKey ? "Key set" : "No key"}
                  {r.brokerCode ? ` · ${r.brokerCode}` : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
