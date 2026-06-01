"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const current = (document.documentElement.getAttribute("data-theme") as Theme) || "dark";
    setTheme(current);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("broker-theme", next);
    } catch {
      /* ignore */
    }
  }

  // Avoid hydration mismatch — render a neutral placeholder until mounted.
  if (!mounted) {
    return (
      <span className="w-9 h-9 rounded-full bg-surface-2 border border-line inline-block" aria-hidden />
    );
  }

  return (
    <button
      onClick={toggle}
      className="w-9 h-9 rounded-full bg-surface-2 border border-line hover:bg-surface-3 text-ink-muted hover:text-ink flex items-center justify-center transition-colors"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      <span className="text-sm">{theme === "dark" ? "☀️" : "🌙"}</span>
    </button>
  );
}
