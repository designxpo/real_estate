"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { Input, Field, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

type Member = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  hasPassword: boolean;
};

const ROLE_TONE: Record<string, "blue" | "amber" | "green" | "purple" | "neutral"> = {
  owner: "green",
  principal: "blue",
  sub_broker: "purple",
  accounts: "amber",
};

export function TeamPanel() {
  const toast = useToast();
  const [team, setTeam] = useState<Member[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/team/invite");
    if (!res.ok) return;
    const j = await res.json();
    setTeam(j.team);
  }
  useEffect(() => {
    load();
  }, []);

  async function invite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        phone: fd.get("phone"),
        email: fd.get("email") || undefined,
        role: fd.get("role"),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(typeof j.error === "string" ? j.error : "Could not send invite");
      return;
    }
    const j = await res.json();
    setInviteUrl(j.inviteUrl);
    setOpen(false);
    toast.push({ message: "Invite sent", description: "They'll get a link to set a password.", tone: "success" });
    load();
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold">Team</h2>
        {!open && (
          <Button size="sm" onClick={() => setOpen(true)}>
            + Invite teammate
          </Button>
        )}
      </div>
      <p className="text-sm text-ink-muted mb-3">
        Invite sub-brokers, accounts staff, or co-principals. They get a one-time link to set their
        password, then sign in by email or phone OTP.
      </p>

      {err && (
        <div className="text-sm text-negative bg-negative/10 border border-negative/20 rounded-inner px-3 py-2 mb-3">
          {err}
        </div>
      )}

      {inviteUrl && (
        <div className="mb-3">
          <div className="text-xs text-ink-faint mb-1">Invite link (dev — also logged to server console):</div>
          <div className="flex gap-2 items-center bg-surface-2 border border-line rounded-inner px-3 py-2">
            <code className="text-xs flex-1 break-all text-ink">{inviteUrl}</code>
            <Button size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(inviteUrl)}>
              Copy
            </Button>
          </div>
        </div>
      )}

      {open && (
        <form onSubmit={invite} className="space-y-3 border border-line rounded-inner p-3 bg-surface-2 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Name" required>
              <Input name="name" required />
            </Field>
            <Field label="Phone" required>
              <Input name="phone" required placeholder="+91 98xxx xxx00" />
            </Field>
            <Field label="Email (optional)">
              <Input name="email" type="email" />
            </Field>
            <Field label="Role" required>
              <Select name="role" defaultValue="sub_broker">
                <option value="sub_broker">Sub-broker</option>
                <option value="accounts">Accounts</option>
                <option value="principal">Principal</option>
              </Select>
            </Field>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send invite"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="rounded-inner border border-line divide-y divide-line">
        {team.map((m) => (
          <div key={m.id} className="p-3 flex items-center justify-between">
            <div className="min-w-0">
              <div className="font-medium text-ink truncate">{m.name}</div>
              <div className="text-xs text-ink-muted truncate">
                {m.phone}
                {m.email ? ` · ${m.email}` : ""}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!m.hasPassword && <Pill tone="neutral" size="xs">invite pending</Pill>}
              <Pill tone={ROLE_TONE[m.role] ?? "neutral"} size="xs">
                {m.role.replace("_", " ")}
              </Pill>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
