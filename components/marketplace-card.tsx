"use client";

import { useState } from "react";

export function MarketplaceCard({
  id,
  title,
  priceLabel,
  meta,
  location,
  photo,
  ownerVerified,
  initialUnlocked,
  owner,
}: {
  id: string;
  title: string;
  priceLabel: string;
  meta: string;
  location: string;
  photo: string | null;
  ownerVerified: boolean;
  initialUnlocked: boolean;
  owner: { name: string; phone: string } | null;
}) {
  const [unlocked, setUnlocked] = useState(initialUnlocked);
  const [contact, setContact] = useState(owner);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unlock() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/marketplace/listings/${id}/unlock`, { method: "POST" });
    setBusy(false);
    if (res.ok) {
      const data = await res.json();
      setContact(data.owner);
      setUnlocked(true);
    } else {
      setError("Could not unlock.");
    }
  }

  return (
    <div className="bg-surface border border-line rounded-lg overflow-hidden flex flex-col">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt={title} className="h-36 w-full object-cover" />
      ) : (
        <div className="h-36 w-full bg-surface-2 flex items-center justify-center text-ink-faint text-xs">No photo</div>
      )}
      <div className="p-3 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="font-medium text-ink text-sm">{title}</div>
          {ownerVerified && (
            <span className="text-[10px] text-emerald-300 border border-emerald-500/40 rounded-full px-1.5 py-0.5">✓ verified</span>
          )}
        </div>
        <div className="text-accent text-sm font-semibold mt-0.5">{priceLabel}</div>
        <div className="text-xs text-ink-muted">{meta}</div>
        <div className="text-xs text-ink-faint">{location}</div>

        <div className="mt-3 pt-3 border-t border-line">
          {unlocked && contact ? (
            <div className="text-sm">
              <div className="text-ink">{contact.name}</div>
              <a href={`tel:${contact.phone}`} className="text-accent">{contact.phone}</a>
            </div>
          ) : (
            <button
              onClick={unlock}
              disabled={busy}
              className="w-full text-sm px-3 py-2 rounded-inner border border-accent text-accent hover:bg-accent/10 disabled:opacity-50"
            >
              {busy ? "Unlocking…" : "🔓 Unlock owner contact"}
            </button>
          )}
          {error && <div className="text-xs text-red-400 mt-1">{error}</div>}
        </div>
      </div>
    </div>
  );
}
