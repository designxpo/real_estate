"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field, Select } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { HelpTooltip, HELP } from "@/components/ui/help-tooltip";
import { cn } from "@/lib/utils";

type FirmDefaults = {
  name: string;
  city: string;
  state: string;
  reraNumber: string;
  gstNumber: string;
  invoicePrefix: string;
};

const STATES = [
  "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Odisha", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

export function OnboardingWizard({
  firm,
  userName,
}: {
  firm: FirmDefaults;
  userName: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FirmDefaults>(firm);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function update<K extends keyof FirmDefaults>(k: K, v: FirmDefaults[K]) {
    setData((d) => ({ ...d, [k]: v }));
  }

  async function finish(withSampleData: boolean) {
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, withSampleData }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      const msg =
        typeof j.error === "string"
          ? j.error
          : `Could not finish setup (HTTP ${res.status}). Check your dev server logs.`;
      setErr(msg);
      return;
    }
    router.push("/home");
    router.refresh();
  }

  return (
    <div className="w-full max-w-xl">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === step ? "w-12 bg-accent" : i < step ? "w-8 bg-accent/60" : "w-8 bg-fill-strong"
            )}
          />
        ))}
      </div>

      {step === 0 && (
        <Card className="space-y-5">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-card bg-gradient-to-br from-accent to-accent-glow mb-3 text-white text-xl">
              👋
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome, {userName.split(" ")[0]}
            </h1>
            <p className="text-sm text-ink-muted mt-1">
              Let's set up your firm in under 2 minutes. Three quick steps.
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-3 p-3 rounded-inner bg-surface-2">
              <Pill tone="blue">1</Pill>
              <div>
                <div className="font-medium">Firm details</div>
                <div className="text-xs text-ink-muted">Needed for GST invoices and listings</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-inner bg-surface-2">
              <Pill tone="blue">2</Pill>
              <div>
                <div className="font-medium">Pick your starting style</div>
                <div className="text-xs text-ink-muted">Empty workspace, or pre-loaded with sample data</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-inner bg-surface-2">
              <Pill tone="blue">3</Pill>
              <div>
                <div className="font-medium">Your 4 daily moves</div>
                <div className="text-xs text-ink-muted">Lead → Site Visit → Deal → Commission</div>
              </div>
            </div>
          </div>
          <Button size="lg" className="w-full" onClick={() => setStep(1)}>
            Let's go
          </Button>
        </Card>
      )}

      {step === 1 && (
        <Card className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Firm details</h2>
            <p className="text-sm text-ink-muted mt-0.5">
              We use these on every invoice. You can edit them later in Settings.
            </p>
          </div>
          {err && (
            <div className="text-sm text-negative bg-negative/10 border border-negative/20 rounded-inner px-3 py-2">
              {err}
            </div>
          )}
          <Field label="Firm name" required>
            <Input value={data.name} onChange={(e) => update("name", e.target.value)} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City">
              <Input value={data.city} onChange={(e) => update("city", e.target.value)} placeholder="Bengaluru" />
            </Field>
            <Field label="State">
              <Select value={data.state} onChange={(e) => update("state", e.target.value)}>
                <option value="">—</option>
                {STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field
            label={<>RERA number <HelpTooltip>{HELP.rera}</HelpTooltip></>}
          >
            <Input value={data.reraNumber} onChange={(e) => update("reraNumber", e.target.value)} placeholder="RERA/KA/12345" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label={<>GSTIN <HelpTooltip>{HELP.gst}</HelpTooltip></>}
            >
              <Input value={data.gstNumber} onChange={(e) => update("gstNumber", e.target.value)} placeholder="29AABCS1234A1Z5" />
            </Field>
            <Field
              label={<>Invoice prefix <HelpTooltip>Used as the start of every invoice number, e.g. SR/2627/0001.</HelpTooltip></>}
            >
              <Input value={data.invoicePrefix} onChange={(e) => update("invoicePrefix", e.target.value)} placeholder="SR" maxLength={6} />
            </Field>
          </div>
          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep(0)}>
              ← Back
            </Button>
            <Button onClick={() => setStep(2)} disabled={!data.name}>
              Continue →
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Pick your starting style</h2>
            <p className="text-sm text-ink-muted mt-0.5">
              You can clear sample data at any time from Settings.
            </p>
          </div>
          {err && (
            <div className="text-sm text-negative bg-negative/10 border border-negative/20 rounded-inner px-3 py-2">
              {err}
            </div>
          )}
          <button
            onClick={() => finish(true)}
            disabled={busy}
            className="w-full text-left rounded-card border border-accent/40 bg-accent/[0.08] p-4 hover:bg-accent/[0.12] transition-colors disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold flex items-center gap-2">
                  Try with sample data
                  <Pill tone="blue" size="xs">recommended</Pill>
                </div>
                <p className="text-sm text-ink-muted mt-1">
                  5 contacts, 3 properties, 3 leads across stages, 1 in-progress deal with commission splits.
                  Perfect for learning — clear it in one click later.
                </p>
              </div>
              <span className="text-2xl">📦</span>
            </div>
          </button>
          <button
            onClick={() => finish(false)}
            disabled={busy}
            className="w-full text-left rounded-card border border-line bg-surface-2 p-4 hover:bg-surface-3 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">Start empty</div>
                <p className="text-sm text-ink-muted mt-1">
                  I'll add real properties and contacts myself.
                </p>
              </div>
              <span className="text-2xl">🧹</span>
            </div>
          </button>
          <Button variant="ghost" onClick={() => setStep(1)} className="w-full">
            ← Back
          </Button>
          {busy && (
            <div className="text-sm text-ink-muted text-center">Setting up your workspace…</div>
          )}
        </Card>
      )}
    </div>
  );
}
