import Link from "next/link";
import { requireUserPage } from "@/lib/auth";
import { getFirmBilling, isBillingConfigured } from "@/lib/billing";
import { getPlans, priceLabel } from "@/lib/plans";
import { BillingPlans } from "@/components/billing-plans";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const user = await requireUserPage();
  const billing = await getFirmBilling(user.firmId);
  const plans = await getPlans();
  const canManage = user.role === "owner" || user.role === "principal";

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <Link href="/marketplace" className="hover:text-ink">Marketplace</Link>
        <span>/</span>
        <span className="text-ink">Plans &amp; billing</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plans &amp; billing</h1>
        <p className="text-sm text-ink-muted">
          Your plan sets how many marketplace listings you can hold <strong>booked</strong> at once.
        </p>
      </div>

      {/* Current usage */}
      <div className="rounded-lg border border-line bg-surface p-4 flex flex-wrap items-center gap-x-8 gap-y-3">
        <div>
          <div className="text-xs text-ink-muted">Current plan</div>
          <div className="text-lg font-semibold text-ink">
            {billing.plan.name} <span className="text-sm text-ink-muted">· {priceLabel(billing.plan)}</span>
          </div>
        </div>
        <div>
          <div className="text-xs text-ink-muted">Active bookings</div>
          <div className="text-lg font-semibold text-ink">
            {billing.activeBookings} <span className="text-sm text-ink-muted">/ {billing.maxActiveBookings}</span>
          </div>
        </div>
        <div>
          <div className="text-xs text-ink-muted">Slots free</div>
          <div className="text-lg font-semibold text-ink">{billing.remaining}</div>
        </div>
        {billing.renewsAt && (
          <div>
            <div className="text-xs text-ink-muted">Renews</div>
            <div className="text-sm text-ink">{new Date(billing.renewsAt).toLocaleDateString("en-IN")}</div>
          </div>
        )}
      </div>

      {canManage ? (
        <BillingPlans plans={plans} currentPlanId={billing.plan.id} configured={isBillingConfigured()} />
      ) : (
        <div className="text-sm text-ink-muted">Only the firm owner can change the plan.</div>
      )}
    </div>
  );
}
