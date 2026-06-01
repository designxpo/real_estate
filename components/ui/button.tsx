import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(function Button({ className, variant = "primary", size = "md", ...rest }, ref) {
  const sizes: Record<Size, string> = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-5 text-sm",
  };
  const variants: Record<Variant, string> = {
    primary:
      "bg-accent text-white hover:bg-accent/90 active:bg-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] disabled:opacity-50",
    secondary:
      "bg-surface-2 text-ink hover:bg-surface-3 border border-line disabled:opacity-50",
    ghost:
      "text-ink-muted hover:text-ink hover:bg-hover disabled:opacity-50",
    danger:
      "bg-negative/10 text-negative border border-negative/20 hover:bg-negative/15 disabled:opacity-50",
    success:
      "bg-positive/10 text-positive border border-positive/20 hover:bg-positive/15 disabled:opacity-50",
  };
  return (
    <button
      ref={ref}
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors disabled:cursor-not-allowed whitespace-nowrap",
        sizes[size],
        variants[variant],
        className
      )}
    />
  );
});
