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
          hover: "var(--accent-hover)",
          soft: "var(--accent-soft)",
          glow: "var(--gold)",
        },
        gold: {
          DEFAULT: "var(--gold)",
          soft: "var(--gold-soft)",
        },
        // Status colours (paired text / -soft tint): e.g. text-urgent bg-urgent-soft
        urgent: { DEFAULT: "var(--urgent)", soft: "var(--urgent-soft)" },
        high: { DEFAULT: "var(--high)", soft: "var(--high-soft)" },
        normal: { DEFAULT: "var(--normal)", soft: "var(--normal-soft)" },
        info: "var(--info)",
        positive: "var(--success)",
        negative: "var(--urgent)",
        warn: "var(--high)",
        // Legacy aliases kept so old `bg-brand` / `text-brand-accent` keep compiling
        brand: { DEFAULT: "var(--accent-primary)", accent: "var(--gold)" },
      },
      borderRadius: {
        app: "28px",
        card: "20px",
        inner: "14px",
        sm: "8px",
        md: "14px",
        lg: "20px",
      },
      fontFamily: {
        sans: ['"Hanken Grotesk"', "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"Fraunces"', "Georgia", "serif"],
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
