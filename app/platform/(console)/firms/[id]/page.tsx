import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPlans, getPlan } from "@/lib/plans";
import { Pill } from "@/components/ui/pill";
import { FirmActions } from "@/components/platform/firm-actions";

export const dynamic = "force-dynamic";

export default async function PlatformFirmDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const firm = await prisma.firm.findUnique({
    where: { id },
    include: {
      users: { select: { id: true, name: true, role: true, email: true, phone: true }, orderBy: { createdAt: "asc" } },
      _count: {
        select: { managedListings: true, leads: true, deals: true, bookings: true, contacts: true },
      },
    },
  });
  if (!firm) notFound();

  const [plans, plan, activeBookings, txns] = await Promise.all([
    getPlans(true),
    getPlan(firm.planId),
    prisma.listingBooking.count({ where: { firmId: id, status: "active" } }),
    prisma.billingTransaction.findMany({
      where: { firmId: id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <Link href="/platform/firms" className="hover:text-ink">Firms</Link>
        <span>/</span>
        <span className="text-ink">{firm.name}</span>
      </div>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{firm.name}</h1>
            {firm.suspendedAt && <Pill tone="red">suspended</Pill>}
            {firm.verificationStatus === "verified" && <Pill tone="green">verified</Pill>}
            {firm.verificationStatus === "pending" && <Pill tone="amber">pending</Pill>}
            {firm.verificationStatus === "rejected" && <Pill tone="red">rejected</Pill>}
          </div>
          <p className="text-sm text-ink-muted mt-1">
            {[firm.firmType, [firm.city, firm.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || "—"}
          </p>
          <p className="text-xs text-ink-faint mt-1">
            Joined {firm.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            {firm.reraNumber ? ` · RERA ${firm.reraNumber}` : ""}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat label="Plan" value={plan.name} />
        <Stat label="Bookings" value={`${activeBookings}/${firm.maxActiveBookings}`} />
        <Stat label="Listings" value={firm._count.managedListings} />
        <Stat label="Leads" value={firm._count.leads} />
        <Stat label="Deals" value={firm._count.deals} />
        <Stat label="Users" value={firm.users.length} />
      </div>

      <FirmActions
        firmId={firm.id}
        currentPlanId={firm.planId}
        currentCap={firm.maxActiveBookings}
        verificationStatus={firm.verificationStatus}
        suspended={!!firm.suspendedAt}
        plans={plans.map((p) => ({ id: p.id, name: p.name }))}
      />

      {/* Users */}
      <section>
        <h2 className="font-semibold mb-2">Team ({firm.users.length})</h2>
        <div className="border border-line rounded-lg divide-y divide-line">
          {firm.users.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <div className="text-sm text-ink truncate">{u.name}</div>
                <div className="text-xs text-ink-muted">{u.email || u.phone}</div>
              </div>
              <Pill tone="neutral" size="xs">{u.role}</Pill>
            </div>
          ))}
        </div>
      </section>

      {/* Billing history */}
      <section>
        <h2 className="font-semibold mb-2">Recent billing</h2>
        {txns.length === 0 ? (
          <p className="text-sm text-ink-faint">No transactions yet.</p>
        ) : (
          <div className="border border-line rounded-lg divide-y divide-line">
            {txns.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div>
                  <span className="text-ink">{t.planId}</span>
                  <span className="text-ink-faint"> · {t.provider}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums text-ink">₹{t.amount.toLocaleString("en-IN")}</span>
                  <Pill tone={t.status === "paid" ? "green" : "amber"} size="xs">{t.status}</Pill>
                  <span className="text-xs text-ink-faint">{t.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <div className="text-xs text-ink-muted">{label}</div>
      <div className="text-lg font-semibold text-ink tabular-nums">{value}</div>
    </div>
  );
}
