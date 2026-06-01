"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Tab = "otp" | "password";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("otp");

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-card bg-gradient-to-br from-accent to-accent-glow mb-3 text-white font-bold text-xl">
            B
          </div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Broker</h1>
          <p className="text-sm text-ink-muted mt-1">Listings, leads & commissions for Indian brokers</p>
        </div>

        <Card className="space-y-4">
          {/* Tab switch */}
          <div className="flex gap-1 p-1 rounded-full bg-surface-2 border border-line">
            <TabButton active={tab === "otp"} onClick={() => setTab("otp")}>
              Phone OTP
            </TabButton>
            <TabButton active={tab === "password"} onClick={() => setTab("password")}>
              Email &amp; password
            </TabButton>
          </div>

          {tab === "otp" ? <OtpForm router={router} /> : <PasswordForm router={router} />}
        </Card>

        <p className="text-center text-xs text-ink-faint mt-4">
          Brokers &amp; staff sign in here. Property owners use the secure link sent by their broker.
        </p>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 h-9 rounded-full text-sm font-medium transition-colors",
        active ? "bg-accent text-white" : "text-ink-muted hover:text-ink"
      )}
    >
      {children}
    </button>
  );
}

type RouterLike = ReturnType<typeof useRouter>;

function OtpForm({ router }: { router: RouterLike }) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [firmName, setFirmName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/auth/otp/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(typeof j.error === "string" ? j.error : "Could not send OTP");
      return;
    }
    setStep("otp");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code, name: name || undefined, firmName: firmName || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(typeof j.error === "string" ? j.error : "Invalid OTP");
      return;
    }
    router.push("/home");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {err && <ErrorBox>{err}</ErrorBox>}
      {step === "phone" ? (
        <form onSubmit={sendOtp} className="space-y-4">
          <Field label="Phone number" required>
            <Input
              type="tel"
              inputMode="tel"
              required
              placeholder="+91 98xxx xxx00"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
          <Button type="submit" disabled={busy} className="w-full" size="lg">
            {busy ? "Sending…" : "Send OTP"}
          </Button>
          <p className="text-xs text-ink-faint text-center">In dev, the OTP is logged to your server console.</p>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-4">
          <div className="text-sm text-ink-muted">
            OTP sent to <span className="text-ink">{phone}</span>
          </div>
          <Field label="6-digit OTP" required>
            <Input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="tracking-[0.4em] text-center text-lg font-semibold"
            />
          </Field>
          <div className="pt-3 border-t border-line space-y-3">
            <p className="text-xs text-ink-faint">First time? Set up your firm:</p>
            <Field label="Your name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Firm name">
              <Input value={firmName} onChange={(e) => setFirmName(e.target.value)} />
            </Field>
          </div>
          <Button type="submit" disabled={busy} className="w-full" size="lg">
            {busy ? "Verifying…" : "Verify & continue"}
          </Button>
          <button type="button" onClick={() => setStep("phone")} className="w-full text-sm text-ink-muted hover:text-ink">
            Change number
          </button>
        </form>
      )}
    </div>
  );
}

function PasswordForm({ router }: { router: RouterLike }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/auth/password/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(typeof j.error === "string" ? j.error : "Invalid email or password");
      return;
    }
    const j = await res.json();
    router.push(j.redirectTo ?? "/home");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {err && <ErrorBox>{err}</ErrorBox>}
      <Field label="Email" required>
        <Input
          type="email"
          inputMode="email"
          required
          autoComplete="email"
          placeholder="you@firm.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field label="Password" required>
        <Input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Button type="submit" disabled={busy} className="w-full" size="lg">
        {busy ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-xs text-ink-faint text-center">
        No password yet? Sign in with Phone OTP, then set one in Settings.
      </p>
    </form>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm text-negative bg-negative/10 border border-negative/20 rounded-inner px-3 py-2">
      {children}
    </div>
  );
}
