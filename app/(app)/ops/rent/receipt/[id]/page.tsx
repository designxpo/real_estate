import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth";
import { periodLabel } from "@/lib/rent";
import { PrintButton } from "@/components/pm-client";

export const dynamic = "force-dynamic";

const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUserPage();
  if (user.role === "sub_broker") redirect("/home");

  const payment = await prisma.pmPayment.findFirst({
    where: { id, firmId: user.firmId },
    include: {
      lease: { include: { unit: { select: { label: true, building: true, addressLine: true, city: true } }, tenant: { select: { name: true } } } },
      charge: { select: { periodMonth: true } },
    },
  });
  if (!payment) notFound();
  const firm = await prisma.firm.findUnique({
    where: { id: user.firmId },
    select: { name: true, address: true, city: true, state: true, pincode: true, panNumber: true, gstNumber: true },
  });

  const unit = [payment.lease.unit.building, payment.lease.unit.label].filter(Boolean).join(", ");
  const forMonth = payment.charge ? periodLabel(payment.charge.periodMonth) : null;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/ops/rent" className="text-sm text-ink-muted hover:text-ink">← Rent</Link>
        <PrintButton />
      </div>

      <div className="rounded-lg border border-line bg-surface p-8 print:border-0 print:p-0">
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div>
            <div className="text-xl font-semibold text-ink">{firm?.name}</div>
            <div className="text-xs text-ink-muted mt-1 leading-relaxed">
              {[firm?.address, firm?.city, firm?.state, firm?.pincode].filter(Boolean).join(", ")}
              {firm?.panNumber && <div>PAN: {firm.panNumber}</div>}
              {firm?.gstNumber && <div>GSTIN: {firm.gstNumber}</div>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-ink">RENT RECEIPT</div>
            <div className="text-xs text-ink-muted mt-1">No: {payment.receiptNo}</div>
            <div className="text-xs text-ink-muted">Date: {payment.paidAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
          </div>
        </div>

        <dl className="grid grid-cols-[140px_1fr] gap-y-3 text-sm mt-6">
          <dt className="text-ink-muted">Received from</dt>
          <dd className="text-ink font-medium">{payment.lease.tenant.name}</dd>
          <dt className="text-ink-muted">Property</dt>
          <dd className="text-ink">{[unit, payment.lease.unit.addressLine, payment.lease.unit.city].filter(Boolean).join(", ")}</dd>
          {forMonth && (<><dt className="text-ink-muted">Rent for</dt><dd className="text-ink">{forMonth}</dd></>)}
          <dt className="text-ink-muted">Payment mode</dt>
          <dd className="text-ink capitalize">{payment.method}{payment.reference ? ` · ${payment.reference}` : ""}</dd>
        </dl>

        <div className="mt-6 flex items-center justify-between bg-surface-2 rounded-inner px-4 py-3">
          <span className="text-sm text-ink-muted">Amount received</span>
          <span className="text-2xl font-semibold text-ink tabular-nums">{inr(Number(payment.amount))}</span>
        </div>

        <div className="mt-8 flex justify-between items-end text-xs text-ink-muted">
          <p className="max-w-xs leading-relaxed">
            This receipt is valid for HRA / income-tax purposes. Retain for your records.
          </p>
          <div className="text-center">
            <div className="h-10" />
            <div className="border-t border-line pt-1 w-40">For {firm?.name}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
