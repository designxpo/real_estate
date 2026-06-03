"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Booking = { id: string; byMyFirm: boolean; daysLeft: number } | null;

export function MarketplaceCard({
  id,
  title,
  priceLabel,
  meta,
  location,
  photo,
  ownerVerified,
  windowDays,
  booking: initialBooking,
}: {
  id: string;
  title: string;
  priceLabel: string;
  meta: string;
  location: string;
  photo: string | null;
  ownerVerified: boolean;
  windowDays: number;
  booking: Booking;
}) {
  const router = useRouter();
  const [booking, setBooking] = useState<Booking>(initialBooking);
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitBooking(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const res = await fetch(`/api/marketplace/listings/${id}/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyer: { name: f.get("name"), phone: f.get("phone"), intent: f.get("intent") || undefined },
      }),
    });
    setBusy(false);
    if (res.ok) {
      const data = await res.json();
      setBooking({ id: data.booking.id, byMyFirm: true, daysLeft: data.booking.daysLeft });
      setFormOpen(false);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Could not book this listing.");
    }
  }

  async function bookingAction(action: "close" | "release") {
    if (!booking) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/marketplace/bookings/${booking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(false);
    if (res.ok) {
      setBooking(null);
      router.refresh();
    } else {
      setError("Action failed.");
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
          {booking?.byMyFirm ? (
            <div className="space-y-2">
              <div className="text-xs">
                <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                  ● Booked by you
                </span>
                <span className="text-ink-muted"> · {booking.daysLeft} day{booking.daysLeft === 1 ? "" : "s"} left to close</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => bookingAction("close")}
                  disabled={busy}
                  className="flex-1 text-sm px-3 py-2 rounded-inner bg-accent text-white hover:bg-accent/90 disabled:opacity-50"
                >
                  Mark sold
                </button>
                <button
                  onClick={() => bookingAction("release")}
                  disabled={busy}
                  className="text-sm px-3 py-2 rounded-inner border border-line text-ink-muted hover:text-ink disabled:opacity-50"
                >
                  Release
                </button>
              </div>
              <p className="text-[11px] text-ink-faint">Chat with the owner opens here once messaging ships.</p>
            </div>
          ) : formOpen ? (
            <form onSubmit={submitBooking} className="space-y-2">
              <p className="text-[11px] text-ink-muted">
                Booking reserves this for {windowDays} days to close. Enter your buyer:
              </p>
              <input name="name" required placeholder="Buyer name" className="w-full bg-surface-2 border border-line rounded-inner px-2 py-1.5 text-sm text-ink" />
              <input name="phone" required placeholder="Buyer phone" className="w-full bg-surface-2 border border-line rounded-inner px-2 py-1.5 text-sm text-ink" />
              <select name="intent" className="w-full bg-surface-2 border border-line rounded-inner px-2 py-1.5 text-sm text-ink" defaultValue="">
                <option value="">Intent (optional)</option>
                <option value="buy">Buy</option>
                <option value="rent">Rent</option>
                <option value="invest">Invest</option>
              </select>
              <div className="flex gap-2">
                <button type="submit" disabled={busy} className="flex-1 text-sm px-3 py-2 rounded-inner bg-accent text-white disabled:opacity-50">
                  {busy ? "Booking…" : "Confirm booking"}
                </button>
                <button type="button" onClick={() => { setFormOpen(false); setError(null); }} className="text-sm px-3 py-2 rounded-inner border border-line text-ink-muted">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setFormOpen(true)}
              className="w-full text-sm px-3 py-2 rounded-inner border border-accent text-accent hover:bg-accent/10"
            >
              Book — I have a buyer
            </button>
          )}
          {error && <div className="text-xs text-red-400 mt-1">{error}</div>}
        </div>
      </div>
    </div>
  );
}
