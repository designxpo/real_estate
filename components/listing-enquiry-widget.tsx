"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChatPanel } from "@/components/chat-panel";

type Booking = { id: string; byMyFirm: boolean; daysLeft: number } | null;

// Sticky enquiry/booking widget for a marketplace listing (spec §4B aside).
// Reuses the booking + chat we already built — no contact reveal.
export function ListingEnquiryWidget({
  listingId,
  title,
  priceLabel,
  priceSecondary,
  windowDays,
  booking: initialBooking,
  ownerVerified,
}: {
  listingId: string;
  title: string;
  priceLabel: string;
  priceSecondary?: string | null;
  windowDays: number;
  booking: Booking;
  ownerVerified: boolean;
}) {
  const router = useRouter();
  const [booking, setBooking] = useState<Booking>(initialBooking);
  const [formOpen, setFormOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capReached, setCapReached] = useState(false);

  async function book(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setCapReached(false);
    const f = new FormData(e.currentTarget);
    const res = await fetch(`/api/marketplace/listings/${listingId}/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buyer: { name: f.get("name"), phone: f.get("phone"), intent: f.get("intent") || undefined } }),
    });
    setBusy(false);
    if (res.ok) {
      const d = await res.json();
      setBooking({ id: d.booking.id, byMyFirm: true, daysLeft: d.booking.daysLeft });
      setFormOpen(false);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Could not book.");
      setCapReached(d.code === "cap_reached");
    }
  }

  async function action(a: "close" | "release") {
    if (!booking) return;
    setBusy(true);
    await fetch(`/api/marketplace/bookings/${booking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: a }),
    });
    setBusy(false);
    setBooking(null);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-line bg-surface shadow-card p-5 space-y-4">
      <div>
        <div className="text-2xl font-semibold text-ink tabular-nums">{priceLabel}</div>
        {priceSecondary && <div className="text-sm text-ink-muted tabular-nums">{priceSecondary}</div>}
      </div>

      {booking?.byMyFirm ? (
        <div className="space-y-3">
          <div className="rounded-md bg-high-soft text-high text-sm px-3 py-2">
            ● Booked by you · {booking.daysLeft} day{booking.daysLeft === 1 ? "" : "s"} left to close
          </div>
          <button onClick={() => action("close")} disabled={busy} className="w-full px-4 py-2.5 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover disabled:opacity-50">
            Mark sold
          </button>
          <button onClick={() => action("release")} disabled={busy} className="w-full px-4 py-2 rounded-md border border-line text-ink-muted text-sm hover:text-ink disabled:opacity-50">
            Release booking
          </button>
        </div>
      ) : booking ? (
        <div className="space-y-3">
          <div className="rounded-md bg-surface-2 text-ink-muted text-sm px-3 py-2">
            Reserved by another broker · {booking.daysLeft} day{booking.daysLeft === 1 ? "" : "s"} left
          </div>
          <button onClick={() => setChatOpen(true)} className="w-full px-4 py-2.5 rounded-md border border-line text-ink text-sm hover:border-accent/60">
            💬 Chat with owner
          </button>
        </div>
      ) : formOpen ? (
        <form onSubmit={book} className="space-y-2">
          <p className="text-xs text-ink-muted">Booking reserves this for {windowDays} days to close. Your buyer:</p>
          <input name="name" required placeholder="Buyer name" className="w-full bg-surface-2 border border-line rounded-md px-3 py-2 text-sm" />
          <input name="phone" required placeholder="Buyer phone" className="w-full bg-surface-2 border border-line rounded-md px-3 py-2 text-sm" />
          <select name="intent" defaultValue="" className="w-full bg-surface-2 border border-line rounded-md px-3 py-2 text-sm">
            <option value="">Intent (optional)</option>
            <option value="buy">Buy</option>
            <option value="rent">Rent</option>
            <option value="invest">Invest</option>
          </select>
          <button type="submit" disabled={busy} className="w-full px-4 py-2.5 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover disabled:opacity-50">
            {busy ? "Booking…" : "Confirm booking"}
          </button>
          <button type="button" onClick={() => { setFormOpen(false); setError(null); }} className="w-full text-xs text-ink-muted hover:text-ink py-1">
            Cancel
          </button>
        </form>
      ) : (
        <div className="space-y-2">
          <button onClick={() => setFormOpen(true)} className="w-full px-4 py-2.5 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover">
            Book — I have a buyer
          </button>
          <button onClick={() => setChatOpen(true)} className="w-full px-4 py-2.5 rounded-md border border-line text-ink text-sm hover:border-accent/60">
            💬 Chat with owner
          </button>
        </div>
      )}

      {error && (
        <div className="text-xs text-urgent">
          {error}
          {capReached && (
            <> <Link href="/billing" className="underline text-accent">View plans</Link></>
          )}
        </div>
      )}

      <p className="text-[11px] text-ink-muted leading-relaxed border-t border-line pt-3">
        No payment to view · Contact stays on-platform — phone numbers are hidden in chat.
        {ownerVerified && <span className="text-success"> · ✓ Verified owner</span>}
      </p>

      {chatOpen && <ChatPanel listingId={listingId} title={title} onClose={() => setChatOpen(false)} />}
    </div>
  );
}
