"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

const FIRM_TYPES = [
  ["proprietorship", "Proprietorship"],
  ["partnership", "Partnership"],
  ["llp", "LLP"],
  ["pvt_ltd", "Pvt. Ltd."],
  ["individual_agent", "Individual agent"],
] as const;

export default function SignupPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const f = new FormData(e.currentTarget);
    const get = (k: string) => (f.get(k) as string)?.trim() || undefined;
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: get("name"),
        email: get("email"),
        phone: get("phone"),
        password: get("password"),
        firmName: get("firmName"),
        firmType: get("firmType"),
        reraNumber: get("reraNumber"),
        reraAuthority: get("reraAuthority"),
        panNumber: get("panNumber"),
        gstNumber: get("gstNumber"),
        address: get("address"),
        city: get("city"),
        state: get("state"),
        pincode: get("pincode"),
        website: get("website"),
      }),
    });
    setBusy(false);
    if (res.ok) {
      const j = await res.json();
      router.push(j.redirectTo ?? "/home");
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setErr(typeof j.error === "string" ? j.error : "Could not create your account");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-semibold text-ink tracking-tight">Create your brokerage account</h1>
          <p className="text-sm text-ink-muted mt-1">
            Set up your firm to list, find buyers, and close deals. You can verify your RERA/PAN anytime.
          </p>
        </div>

        <Card className="space-y-6">
          {err && (
            <div className="text-sm text-urgent bg-urgent-soft border border-urgent/30 rounded-inner px-3 py-2">{err}</div>
          )}

          <a
            href="/api/auth/google/start"
            className="flex items-center justify-center gap-2 w-full h-11 rounded-full border border-line text-ink font-medium hover:bg-hover transition-colors"
          >
            <span className="text-lg">G</span> Continue with Google
          </a>
          <div className="flex items-center gap-3 text-xs text-ink-faint">
            <div className="flex-1 h-px bg-line" /> or sign up with details <div className="flex-1 h-px bg-line" />
          </div>

          <form onSubmit={submit} className="space-y-6">
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-ink">Your account</h2>
              <Field label="Full name" required><Input name="name" required placeholder="Rakesh Kumar" /></Field>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Email" required><Input name="email" type="email" required placeholder="you@firm.com" /></Field>
                <Field label="Phone" required><Input name="phone" type="tel" required placeholder="+91 98xxxxxx00" /></Field>
              </div>
              <Field label="Password" required><Input name="password" type="password" required minLength={8} placeholder="At least 8 characters" /></Field>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-ink">Firm details</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Firm name" required><Input name="firmName" required placeholder="Sample Realty" /></Field>
                <Field label="Firm type">
                  <select name="firmType" defaultValue="" className="w-full bg-surface-2 border border-line rounded-inner px-3 py-2 text-sm text-ink">
                    <option value="">Select…</option>
                    {FIRM_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="RERA registration no."><Input name="reraNumber" placeholder="A51234567890" /></Field>
                <Field label="RERA authority"><Input name="reraAuthority" placeholder="MahaRERA" /></Field>
                <Field label="PAN"><Input name="panNumber" placeholder="ABCDE1234F" className="uppercase" /></Field>
                <Field label="GSTIN"><Input name="gstNumber" placeholder="27ABCDE1234F1Z5" className="uppercase" /></Field>
              </div>
              <Field label="Office address"><Input name="address" placeholder="Street, area" /></Field>
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="City"><Input name="city" placeholder="Pune" /></Field>
                <Field label="State"><Input name="state" placeholder="Maharashtra" /></Field>
                <Field label="Pincode"><Input name="pincode" inputMode="numeric" placeholder="411045" /></Field>
              </div>
              <Field label="Website"><Input name="website" placeholder="https://…" /></Field>
            </section>

            <Button type="submit" disabled={busy} className="w-full" size="lg">
              {busy ? "Creating…" : "Create account"}
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-ink-muted mt-4">
          Already have an account? <Link href="/login" className="text-accent hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
