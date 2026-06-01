"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";

export function LanguageSwitcher({ current }: { current: string }) {
  const router = useRouter();
  const [lang, setLang] = useState(current);
  const [saving, setSaving] = useState(false);

  async function change(next: string) {
    setLang(next);
    setSaving(true);
    try {
      await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredLanguage: next }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={lang}
      disabled={saving}
      onChange={(e) => change(e.target.value)}
      className="bg-surface-2 border border-line rounded-inner px-3 py-1.5 text-sm text-ink"
    >
      {SUPPORTED_LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
