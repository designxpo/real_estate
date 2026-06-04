import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth";
import { currentPeriodMonth, periodLabel, upiLink } from "@/lib/rent";
import { GenerateRentButton, RecordPaymentForm, UpiCollect } from "@/components/pm-client";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  paid: "bg-normal-soft text-normal",
  partial: "bg-high-soft text-high",
  due: "bg-surface-2 text-ink-muted",
};
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export default async function RentPage() {
  const user = await requireUserPage();
  if (user.role === "sub_broker") redirect("/home");
  const firm = await prisma.firm.findUnique({ where: { id: user.firmId }, select: { name: true, upiVpa: true } });

  const now = new Date();
  const period = currentPeriodMonth(now);
  const monthStart = period;

  const [charges, outstandingRows, collectedAgg, maintAgg, activeLeaseCount] = await Promise.all([
    prisma.pmRentCharge.findMany({
      where: { firmId: user.firmId, periodMonth: period },
      include: { lease: { include: { unit: { select: { label: true, building: true } }, tenant: { select: { name: true } } } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.pmRentCharge.findMany({ where: { firmId: user.firmId, status: { not: "paid" } }, select: { amount: true, paidAmount: true } }),
    prisma.pmPayment.aggregate({ _sum: { amount: true }, where: { firmId: user.firmId, paidAt: { gte: monthStart } } }),
    prisma.pmWorkOrder.aggregate({ _sum: { costAmount: true }, where: { firmId: user.firmId, createdAt: { gte: monthStart } } }),
    prisma.pmLease.count({ where: { firmId: user.firmId, status: "active" } }),
  ]);

  const outstanding = outstandingRows.reduce((a, c) => a + (Number(c.amount) - Number(c.paidAmount)), 0);
  const collected = Number(collectedAgg._sum.amount ?? 0);
  const maintenance = Number(maintAgg._sum.costAmount ?? 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <Link href="/ops" className="hover:text-ink">Operations</Link><span>/</span><span className="text-ink">Rent &amp; collection</span>
      </div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold tracking-tight">Rent &amp; collection</h1>
        <GenerateRentButton />
      </div>

      {/* P&L + outstanding */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label={`Collected · ${period.toLocaleString("en-IN", { month: "short" })}`} value={inr(collected)} />
        <Kpi label="Outstanding (all)" value={inr(outstanding)} tone={outstanding > 0 ? "urgent" : "normal"} />
        <Kpi label={`Maintenance · ${period.toLocaleString("en-IN", { month: "short" })}`} value={inr(maintenance)} />
        <Kpi label="Owner P&L (mo)" value={inr(collected - maintenance)} tone={collected - maintenance >= 0 ? "normal" : "urgent"} />
      </div>

      {!firm?.upiVpa && (
        <div className="text-xs text-high bg-high-soft/40 border border-high/30 rounded-inner px-3 py-2">
          Add your UPI ID in <Link href="/settings/firm" className="underline">Settings → Firm</Link> to collect rent via UPI QR/links.
        </div>
      )}

      <div>
        <h2 className="font-semibold mb-3">{periodLabel(period)} rent roll</h2>
        {charges.length === 0 ? (
          <div className="text-sm text-ink-faint border border-dashed border-line rounded-inner py-10 text-center">
            {activeLeaseCount === 0
              ? "No active leases. Add tenants on the Units page first."
              : "No charges generated for this month yet — click “Generate this month's rent”."}
          </div>
        ) : (
          <div className="space-y-2">
            {charges.map((c) => {
              const due = Number(c.amount) - Number(c.paidAmount);
              const unit = [c.lease.unit.building, c.lease.unit.label].filter(Boolean).join(" · ");
              const upi = firm?.upiVpa && due > 0
                ? upiLink({ vpa: firm.upiVpa, name: firm.name, amount: due, note: `Rent ${periodLabel(period)} ${c.lease.unit.label}` })
                : null;
              return (
                <div key={c.id} className="rounded-lg border border-line bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-ink">{unit}</div>
                      <div className="text-xs text-ink-muted">{c.lease.tenant.name} · due {c.dueDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                      <div className="text-sm mt-1 tabular-nums">
                        {inr(Number(c.amount))}
                        {Number(c.paidAmount) > 0 && <span className="text-ink-muted"> · paid {inr(Number(c.paidAmount))}</span>}
                        {due > 0 && <span className="text-urgent"> · {inr(due)} due</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS[c.status]}`}>{c.status}</span>
                      {upi && <UpiCollect upi={upi} />}
                      {due > 0 && <RecordPaymentForm leaseId={c.leaseId} chargeId={c.id} defaultAmount={due} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "urgent" }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="text-xs text-ink-muted">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums mt-1 ${tone === "urgent" ? "text-urgent" : "text-ink"}`}>{value}</div>
    </div>
  );
}
