"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

export default function PlatformLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/platform/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(typeof j.error === "string" ? j.error : "Invalid credentials");
      return;
    }
    router.push("/platform");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-app">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-card bg-gradient-to-br from-accent to-accent-glow mb-3 text-white font-bold text-xl">
            ◆
          </div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Platform Console</h1>
          <p className="text-sm text-ink-muted mt-1">Operator access — manage firms, plans &amp; metrics</p>
        </div>

        <Card>
          <form onSubmit={submit} className="space-y-4">
            {err && (
              <div className="text-sm text-negative bg-negative/10 border border-negative/20 rounded-inner px-3 py-2">
                {err}
              </div>
            )}
            <Field label="Email" required>
              <Input
                type="email"
                required
                autoComplete="username"
                placeholder="owner@yourcompany.com"
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
          </form>
        </Card>

        <p className="text-center text-xs text-ink-faint mt-4">
          Restricted area. Brokers sign in at the main portal.
        </p>
      </div>
    </div>
  );
}
