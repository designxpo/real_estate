"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { Input, Field } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

// Broker-facing panel on the property detail page. Lets a broker assign a
// landlord and fire the magic link that moves draft -> pending.
export function LandlordActivationPanel({
  propertyId,
  status,
  landlord,
}: {
  propertyId: string;
  status: string;
  landlord: { name: string; phone: string } | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const statusTone =
    status === "active" ? "green" : status === "booked" ? "amber" : status === "pending" ? "blue" : "neutral";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/properties/${propertyId}/request-activation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        landlordName: fd.get("landlordName"),
        landlordPhone: fd.get("landlordPhone"),
        landlordEmail: fd.get("landlordEmail") || undefined,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(typeof j.error === "string" ? j.error : "Could not send activation link");
      return;
    }
    const j = await res.json();
    setLink(j.magicLinkUrl);
    setOpen(false);
    toast.push({
      message: "Activation link sent to landlord",
      description: "Status moved to Pending Authorization.",
      tone: "success",
    });
    router.refresh();
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold">Landlord activation</h2>
        <Pill tone={statusTone as "green" | "amber" | "blue" | "neutral"} size="sm">
          {status.replace(/_/g, " ")}
        </Pill>
      </div>
      <p className="text-sm text-ink-muted mb-3">
        Assign the property owner and send them a secure link to confirm the listing. They can then
        toggle Active / Booked themselves — no account or password needed.
      </p>

      {landlord && (
        <div className="text-sm text-ink-muted mb-3">
          Owner on file: <span className="text-ink">{landlord.name}</span> · {landlord.phone}
        </div>
      )}

      {err && (
        <div className="text-sm text-negative bg-negative/10 border border-negative/20 rounded-inner px-3 py-2 mb-3">
          {err}
        </div>
      )}

      {link && (
        <div className="mb-3">
          <div className="text-xs text-ink-faint mb-1">Magic link (dev — also logged to server console):</div>
          <div className="flex gap-2 items-center bg-surface-2 border border-line rounded-inner px-3 py-2">
            <code className="text-xs flex-1 break-all text-ink">{link}</code>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigator.clipboard.writeText(link)}
            >
              Copy
            </Button>
          </div>
        </div>
      )}

      {!open ? (
        <Button onClick={() => setOpen(true)}>
          {landlord ? "Re-send activation link" : "Assign landlord & send link"}
        </Button>
      ) : (
        <form onSubmit={submit} className="space-y-3 border border-line rounded-inner p-3 bg-surface-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Landlord name" required>
              <Input name="landlordName" required defaultValue={landlord?.name ?? ""} />
            </Field>
            <Field label="Landlord phone" required>
              <Input name="landlordPhone" required placeholder="+91 98xxx xxx00" defaultValue={landlord?.phone ?? ""} />
            </Field>
          </div>
          <Field label="Email (optional)">
            <Input name="landlordEmail" type="email" />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send activation link"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
