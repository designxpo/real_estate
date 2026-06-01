import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  glow = false,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { glow?: boolean }) {
  return (
    <div
      {...rest}
      className={cn(
        "relative rounded-card border border-line bg-surface p-6 shadow-card",
        "before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-line-strong before:to-transparent before:rounded-t-card",
        glow && "ring-1 ring-accent/30",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 mb-4", className)}>
      <div className="min-w-0">
        <h3 className="text-lg font-semibold tracking-tight text-ink">{title}</h3>
        {subtitle && (
          <p className="text-sm text-ink-muted mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
