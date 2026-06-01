"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Toast = {
  id: string;
  message: string;
  description?: string;
  tone?: "neutral" | "success" | "danger" | "warn";
  // If set, the toast shows an "Undo" button that calls this within `undoMs`.
  undo?: () => Promise<void> | void;
  undoMs?: number;
};

type Ctx = {
  push: (t: Omit<Toast, "id">) => void;
};

const ToastCtx = createContext<Ctx | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setItems((xs) => [...xs, { id, ...t }]);
    const ttl = t.undoMs ?? 5000;
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), ttl);
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {items.map((t) => (
          <ToastItem
            key={t.id}
            toast={t}
            onDismiss={() => setItems((xs) => xs.filter((x) => x.id !== t.id))}
          />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [remaining, setRemaining] = useState(toast.undoMs ?? 5000);
  useEffect(() => {
    const start = Date.now();
    const i = setInterval(() => {
      const left = (toast.undoMs ?? 5000) - (Date.now() - start);
      setRemaining(Math.max(0, left));
    }, 100);
    return () => clearInterval(i);
  }, [toast.undoMs]);

  const tones = {
    neutral: "border-line-strong bg-surface-3",
    success: "border-positive/30 bg-positive/10",
    danger: "border-negative/30 bg-negative/10",
    warn: "border-warn/30 bg-warn/10",
  };
  const icons = { neutral: "•", success: "✓", danger: "✕", warn: "!" };
  const tone = toast.tone ?? "neutral";

  return (
    <div
      className={cn(
        "pointer-events-auto min-w-[300px] max-w-md rounded-card border px-4 py-3 shadow-card animate-slideUp",
        tones[tone]
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg leading-none mt-0.5">{icons[tone]}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-ink">{toast.message}</div>
          {toast.description && <div className="text-xs text-ink-muted mt-0.5">{toast.description}</div>}
        </div>
        {toast.undo && (
          <button
            onClick={async () => {
              await toast.undo!();
              onDismiss();
            }}
            className="text-xs font-medium text-accent hover:underline whitespace-nowrap"
          >
            Undo {Math.ceil(remaining / 1000)}s
          </button>
        )}
        <button onClick={onDismiss} className="text-ink-faint hover:text-ink text-sm leading-none">
          ×
        </button>
      </div>
    </div>
  );
}
