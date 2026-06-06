import { prisma } from "@/lib/db";
import { getPlans } from "@/lib/plans";
import { PlansManager } from "@/components/platform/plans-manager";

export const dynamic = "force-dynamic";

export default async function PlatformPlansPage() {
  const plans = await getPlans(true); // include inactive

  // Subscriber counts per plan, so the operator sees impact before editing.
  const grouped = await prisma.firm.groupBy({
    by: ["planId"],
    _count: { _all: true },
  });
  const subscribers: Record<string, number> = {};
  for (const g of grouped) subscribers[g.planId] = g._count._all;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plans &amp; pricing</h1>
        <p className="text-sm text-ink-muted">
          Edit pricing and booking caps live. Changes apply to new subscriptions immediately; use
          “apply to subscribers” to push a cap change to firms already on a plan.
        </p>
      </div>
      <PlansManager initialPlans={plans} subscribers={subscribers} />
    </div>
  );
}
