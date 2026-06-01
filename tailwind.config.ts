import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        app: "var(--bg-app)",
        surface: {
          DEFAULT: "var(--bg-surface)",
          2: "var(--bg-surface-2)",
          3: "var(--bg-surface-3)",
        },
        ink: {
          DEFAULT: "var(--text-primary)",
          muted: "var(--text-secondary)",
          faint: "var(--text-tertiary)",
        },
        // Theme-aware lines / hover / chip fills (replace hardcoded white/[alpha])
        line: {
          DEFAULT: "var(--line)",
          strong: "var(--line-strong)",
        },
        hover: "var(--hover)",
        fill: {
          DEFAULT: "var(--fill)",
          strong: "var(--fill-strong)",
        },
        accent: {
          DEFAULT: "var(--accent-primary)",
          glow: "#22D3EE",
        },
        positive: "#22C55E",
        negative: "#EF4444",
        warn: "#F59E0B",
        // Legacy aliases kept so old `bg-brand` / `text-brand-accent` keep compiling
        brand: { DEFAULT: "var(--accent-primary)", accent: "#22D3EE" },
      },
      borderRadius: {
        app: "28px",
        card: "20px",
        inner: "14px",
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "var(--shadow-card)",
        glow: "var(--shadow-glow)",
      },
      backgroundImage: {
        "desktop": "var(--desktop-grad)",
        "chart-bloom": "var(--bg-chart-bloom)",
        "promo-glow": "var(--bg-promo-glow)",
        "card-stroke": "var(--bg-card-stroke)",
      },
      keyframes: {
        slideUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: { slideUp: "slideUp 180ms ease-out" },
    },
  },
  plugins: [],
} satisfies Config;
