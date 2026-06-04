import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth";
import { AddUnitForm, LeaseForm, UnitStatusButton } from "@/components/pm-client";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  occupied: "bg-normal-soft text-normal",
  vacant: "bg-high-soft text-high",
  notice: "bg-urgent-soft text-urgent",
};

export default async function OpsUnitsPage() {
  const user = await requireUserPage();
  if (user.role === "sub_broker") redirect("/home");

  const units = await prisma.pmUnit.findMany({
    where: { firmId: user.firmId },
    orderBy: [{ building: "asc" }, { label: "asc" }],
    include: {
      leases: { where: { status: "active" }, take: 1, include: { tenant: { select: { name: true, phone: true } } } },
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <Link href="/ops" className="hover:text-ink">Operations</Link><span>/</span><span className="text-ink">Units</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Units</h1>
        <AddUnitForm />
      </div>

      {units.length === 0 ? (
        <div className="text-sm text-ink-faint border border-dashed border-line rounded-inner py-10 text-center">No units yet.</div>
      ) : (
        <div className="space-y-3">
          {units.map((u) => {
            const lease = u.leases[0];
            return (
              <div key={u.id} className="rounded-lg border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink">{[u.building, u.label].filter(Boolean).join(" · ")}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS[u.status] ?? "bg-surface-2 text-ink-muted"}`}>{u.status}</span>
                    </div>
                    <div className="text-xs text-ink-muted mt-0.5">
                      {[u.bedrooms ? `${u.bedrooms} BHK` : null, u.sqft ? `${u.sqft} sqft` : null, u.city].filter(Boolean).join(" · ")}
                      {u.marketRent ? ` · ₹${Number(u.marketRent).toLocaleString("en-IN")}/mo` : ""}
                    </div>
                    {lease && (
                      <div className="text-xs text-ink mt-1">
                        Tenant: <span className="font-medium">{lease.tenant.name}</span> · ₹{Number(lease.rentAmount).toLocaleString("en-IN")}/mo
                        {lease.endDate ? ` · until ${lease.endDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0"><UnitStatusButton id={u.id} status={u.status} /></div>
                </div>
                {u.status !== "occupied" && (
                  <div className="mt-3"><LeaseForm unitId={u.id} /></div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
