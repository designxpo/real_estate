import { cn } from "@/lib/utils";

type Tone = "neutral" | "blue" | "amber" | "green" | "red" | "purple" | "cyan";

const TONES: Record<Tone, string> = {
  neutral: "bg-fill text-ink-muted",
  blue: "bg-accent/15 text-accent",
  amber: "bg-warn/15 text-warn",
  green: "bg-positive/15 text-positive",
  red: "bg-negative/15 text-negative",
  purple: "bg-[#8b5cf6]/15 text-[#a78bfa]",
  cyan: "bg-accent-glow/15 text-accent-glow",
};

export function Pill({
  tone = "neutral",
  children,
  className,
  size = "sm",
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  size?: "xs" | "sm" | "md";
}) {
  const sizes = {
    xs: "text-[10px] px-1.5 py-0.5 font-semibold uppercase tracking-wider",
    sm: "text-xs px-2 py-0.5 font-medium",
    md: "text-sm px-3 py-1 font-medium",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full", sizes[size], TONES[tone], className)}>
      {children}
    </span>
  );
}

// Up/down change indicator — matches the "Change pill" in the design spec.
export function ChangePill({ value, suffix = "%" }: { value: number; suffix?: string }) {
  if (value === 0) return <Pill tone="neutral">0{suffix}</Pill>;
  const positive = value > 0;
  return (
    <Pill tone={positive ? "green" : "red"}>
      {positive ? "▲" : "▼"} {Math.abs(value).toFixed(2)}{suffix}
    </Pill>
  );
}

export function StatusDot({ tone = "neutral" }: { tone?: Tone }) {
  const colors: Record<Tone, string> = {
    neutral: "bg-ink-faint",
    blue: "bg-accent",
    amber: "bg-warn",
    green: "bg-positive",
    red: "bg-negative",
    purple: "bg-[#a78bfa]",
    cyan: "bg-accent-glow",
  };
  return <span className={cn("inline-block w-1.5 h-1.5 rounded-full", colors[tone])} />;
}
