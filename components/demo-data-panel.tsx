"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { useToast } from "@/components/ui/toast";

export function DemoDataPanel({ demoCount }: { demoCount: number }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [, start] = useTransition();

  async function clear() {
    if (
      !confirm(
        "Remove all demo data? This will delete every demo contact, property, lead, deal, and commission split. Your real data is untouched."
      )
    )
      return;
    setBusy(true);
    const res = await fetch("/api/onboarding", { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      toast.push({ message: "Could not clear demo data", tone: "danger" });
      return;
    }
    const j = await res.json();
    const r = j.removed;
    toast.push({
      message: "Demo data cleared",
      description: `Removed ${r.properties} properties, ${r.contacts} contacts, ${r.leads} leads, ${r.deals} deals`,
      tone: "success",
    });
    start(() => router.refresh());
  }

  return (
    <Card className="border-purple-500/30 bg-[#8b5cf6]/[0.05]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold flex items-center gap-2">
            Demo data <Pill tone="purple" size="xs">{demoCount} props</Pill>
          </h2>
          <p className="text-sm text-ink-muted mt-1">
            Sample contacts, properties, leads, and a deal we loaded so you could learn.
            Clear it when you're ready to work with real data only.
          </p>
        </div>
        <Button variant="danger" onClick={clear} disabled={busy} size="sm">
          {busy ? "Clearing…" : "Clear demo data"}
        </Button>
      </div>
    </Card>
  );
}
