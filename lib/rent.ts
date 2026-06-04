// Rent & collection helpers (PM ops §4D3).
import { prisma } from "@/lib/db";

export function currentPeriodMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function periodLabel(d: Date): string {
  return d.toLocaleString("en-IN", { month: "long", year: "numeric" });
}

// Indian financial year label like "2627" for Apr-2026 → Mar-2027.
export function fyLabel(d = new Date()): string {
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; // FY starts April
  return `${String(y % 100).padStart(2, "0")}${String((y + 1) % 100).padStart(2, "0")}`;
}

// UPI deep link (NPCI spec). Opens any UPI app to pay the firm's VPA.
export function upiLink(opts: { vpa: string; name: string; amount: number; note?: string }): string {
  const p = new URLSearchParams({ pa: opts.vpa, pn: opts.name, am: opts.amount.toFixed(2), cu: "INR" });
  if (opts.note) p.set("tn", opts.note);
  return `upi://pay?${p.toString()}`;
}

// Create current-month rent charges for all active leases. Idempotent via the
// (leaseId, periodMonth) unique constraint — re-runs only fill new ones.
export async function generateChargesForMonth(firmId: string, period = currentPeriodMonth()): Promise<number> {
  const leases = await prisma.pmLease.findMany({ where: { firmId, status: "active" } });
  let created = 0;
  for (const l of leases) {
    const dueDate = new Date(period.getFullYear(), period.getMonth(), Math.min(l.rentDueDay || 5, 28));
    try {
      await prisma.pmRentCharge.create({
        data: { firmId, leaseId: l.id, unitId: l.unitId, periodMonth: period, amount: l.rentAmount, dueDate, status: "due" },
      });
      created++;
    } catch {
      /* charge for this lease+month already exists */
    }
  }
  return created;
}

export async function nextReceiptNo(firmId: string): Promise<string> {
  const n = await prisma.pmPayment.count({ where: { firmId } });
  return `RENT/${fyLabel()}/${String(n + 1).padStart(4, "0")}`;
}
