import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        {...rest}
        className={cn(
          "w-full rounded-inner border border-line bg-surface-2 px-3 py-2 text-sm text-ink",
          "placeholder:text-ink-faint focus:outline-none",
          className
        )}
      />
    );
  }
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        {...rest}
        className={cn(
          "w-full rounded-inner border border-line bg-surface-2 px-3 py-2 text-sm text-ink appearance-none",
          "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22><path fill=%22%239499A6%22 d=%22M6 8L2 4h8z%22/></svg>')] bg-no-repeat bg-[right_0.7rem_center] pr-8",
          className
        )}
      >
        {children}
      </select>
    );
  }
);

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        {...rest}
        className={cn(
          "w-full rounded-inner border border-line bg-surface-2 px-3 py-2 text-sm text-ink",
          "placeholder:text-ink-faint focus:outline-none",
          className
        )}
      />
    );
  }
);

export function Field({
  label,
  hint,
  children,
  required,
  htmlFor,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="text-xs font-medium text-ink-muted flex items-center gap-1.5">
        {label}
        {required && <span className="text-negative">*</span>}
        {hint}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
