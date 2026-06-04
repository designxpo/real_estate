import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth";
import { WorkOrderForm, WorkOrderActions } from "@/components/pm-client";

export const dynamic = "force-dynamic";

const PRIORITY: Record<string, string> = {
  urgent: "bg-urgent-soft text-urgent",
  high: "bg-high-soft text-high",
  normal: "bg-normal-soft text-normal",
};
const COLUMNS: { key: string; label: string }[] = [
  { key: "new", label: "New" },
  { key: "assigned", label: "Assigned" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
];

export default async function WorkOrdersPage() {
  const user = await requireUserPage();
  if (user.role === "sub_broker") redirect("/home");

  const [workOrders, units] = await Promise.all([
    prisma.pmWorkOrder.findMany({
      where: { firmId: user.firmId, status: { not: "cancelled" } },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      include: { unit: { select: { label: true, building: true } } },
    }),
    prisma.pmUnit.findMany({ where: { firmId: user.firmId }, select: { id: true, label: true, building: true }, orderBy: [{ building: "asc" }, { label: "asc" }] }),
  ]);

  const now = new Date();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <Link href="/ops" className="hover:text-ink">Operations</Link><span>/</span><span className="text-ink">Work orders</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Work orders</h1>
        <WorkOrderForm units={units} />
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 items-start">
        {COLUMNS.map((col) => {
          const items = workOrders.filter((w) => w.status === col.key);
          return (
            <div key={col.key} className="rounded-lg border border-line bg-surface-2/40 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">{col.label} ({items.length})</div>
              <div className="space-y-2">
                {items.length === 0 && <div className="text-xs text-ink-faint py-2">—</div>}
                {items.map((w) => {
                  const overdue = w.slaDueAt && w.slaDueAt < now && w.status !== "done";
                  return (
                    <div key={w.id} className="rounded-inner border border-line bg-surface p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-medium text-ink">{w.title}</div>
                        <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full ${PRIORITY[w.priority]}`}>{w.priority}</span>
                      </div>
                      <div className="text-xs text-ink-muted mt-0.5">
                        {[w.unit ? [w.unit.building, w.unit.label].filter(Boolean).join(" ") : null, w.category].filter(Boolean).join(" · ")}
                      </div>
                      {w.assignee && <div className="text-xs text-ink-faint mt-0.5">→ {w.assignee}</div>}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[11px] text-ink-faint">
                          {w.costAmount ? `₹${Number(w.costAmount).toLocaleString("en-IN")}` : ""}
                          {overdue && <span className="text-urgent ml-1">overdue</span>}
                        </span>
                        <WorkOrderActions id={w.id} status={w.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
