import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import type { ChecklistItem } from "@/lib/checklist";

export function GettingStarted({
  items,
  done,
  total,
  pct,
}: {
  items: ChecklistItem[];
  done: number;
  total: number;
  pct: number;
}) {
  if (done === total) {
    return (
      <Card className="flex items-center gap-4">
        <span className="text-2xl">🎉</span>
        <div className="flex-1">
          <div className="font-semibold">All set!</div>
          <p className="text-xs text-ink-muted">
            You've completed every step. Bookmark this page — your activity feed lives here.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            Getting started
            <Pill tone="blue" size="xs">
              {done}/{total}
            </Pill>
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Each task takes under 2 minutes. Finish them to learn the app end-to-end.
          </p>
        </div>
        <div className="hidden sm:block w-32 h-2 bg-fill rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent to-accent-glow transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="flex items-start gap-3 p-2.5 rounded-inner hover:bg-hover transition-colors group"
          >
            <span
              className={
                "mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 " +
                (item.done
                  ? "bg-positive/20 text-positive"
                  : "bg-fill text-ink-faint border border-line")
              }
            >
              {item.done ? "✓" : ""}
            </span>
            <div className="flex-1 min-w-0">
              <div
                className={
                  "text-sm font-medium " + (item.done ? "text-ink-faint line-through" : "text-ink")
                }
              >
                {item.label}
              </div>
              {!item.done && <div className="text-xs text-ink-faint mt-0.5">{item.why}</div>}
            </div>
            {!item.done && (
              <span className="text-ink-faint group-hover:text-accent text-sm">→</span>
            )}
          </Link>
        ))}
      </div>
    </Card>
  );
}
