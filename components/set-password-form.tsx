"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

const ROLE_HOME: Record<string, string> = {
  landlord: "/landlord",
  sub_broker: "/my-leads",
  accounts: "/reports/commissions",
  owner: "/home",
  principal: "/home",
};

export function SetPasswordForm({
  role,
  requireCurrent,
}: {
  role: string;
  requireCurrent: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== confirm) {
      setErr("Passwords don't match");
      return;
    }
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/auth/password/set", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        newPassword: pw,
        currentPassword: requireCurrent ? current : undefined,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      const msg =
        typeof j.error === "string"
          ? j.error
          : j.error?.fieldErrors?.newPassword?.[0] ?? "Could not set password";
      setErr(msg);
      return;
    }
    router.push(ROLE_HOME[role] ?? "/home");
    router.refresh();
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-4">
        {err && (
          <div className="text-sm text-negative bg-negative/10 border border-negative/20 rounded-inner px-3 py-2">
            {err}
          </div>
        )}
        {requireCurrent && (
          <Field label="Current password" required>
            <Input type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
          </Field>
        )}
        <Field label="New password" required hint={<span className="text-ink-faint font-normal">(min 8 chars)</span>}>
          <Input type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        </Field>
        <Field label="Confirm password" required>
          <Input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </Field>
        <Button type="submit" disabled={busy} className="w-full" size="lg">
          {busy ? "Saving…" : "Save password & continue"}
        </Button>
      </form>
    </Card>
  );
}
