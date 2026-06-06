import Link from "next/link";
import { prisma } from "@/lib/db";
import { getPlans } from "@/lib/plans";
import { Pill } from "@/components/ui/pill";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function PlatformFirmsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; plan?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = sp.status ?? "";
  const planFilter = sp.plan ?? "";

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
      { reraNumber: { contains: q, mode: "insensitive" } },
    ];
  }
  if (status === "suspended") where.suspendedAt = { not: null };
  if (status === "active") where.suspendedAt = null;
  if (status === "verified") where.verificationStatus = "verified";
  if (status === "pending") where.verificationStatus = "pending";
  if (planFilter) where.planId = planFilter;

  const [firms, plans, total] = await Promise.all([
    prisma.firm.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        planId: true,
        verificationStatus: true,
        suspendedAt: true,
        createdAt: true,
        _count: { select: { users: true, managedListings: true } },
      },
    }),
    getPlans(true),
    prisma.firm.count({ where }),
  ]);

  const planName: Record<string, string> = {};
  for (const p of plans) planName[p.id] = p.name;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Firms</h1>
        <p className="text-sm text-ink-muted">{total} firm{total === 1 ? "" : "s"} on the platform.</p>
      </div>

      <form className="flex flex-wrap gap-2" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, city, RERA…"
          className="flex-1 min-w-[180px] bg-surface-2 border border-line rounded-inner px-3 py-2 text-sm text-ink"
        />
        <select name="status" defaultValue={status} className="bg-surface-2 border border-line rounded-inner px-3 py-2 text-sm text-ink">
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="verified">Verified</option>
          <option value="pending">Verification pending</option>
        </select>
        <select name="plan" defaultValue={planFilter} className="bg-surface-2 border border-line rounded-inner px-3 py-2 text-sm text-ink">
          <option value="">Any plan</option>
          {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button className="text-sm px-4 py-2 rounded-inner bg-accent text-white">Filter</button>
      </form>

      <div className="border border-line rounded-lg divide-y divide-line">
        {firms.length === 0 ? (
          <div className="p-6 text-sm text-ink-faint">No firms match.</div>
        ) : (
          firms.map((f) => (
            <Link key={f.id} href={`/platform/firms/${f.id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-hover transition-colors">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink truncate">{f.name}</span>
                  {f.suspendedAt && <Pill tone="red" size="xs">suspended</Pill>}
                  {f.verificationStatus === "verified" && <Pill tone="green" size="xs">verified</Pill>}
                  {f.verificationStatus === "pending" && <Pill tone="amber" size="xs">pending</Pill>}
                </div>
                <div className="text-xs text-ink-muted">
                  {[f.city, f.state].filter(Boolean).join(", ") || "—"} · {f._count.users} user{f._count.users === 1 ? "" : "s"} · {f._count.managedListings} listing{f._count.managedListings === 1 ? "" : "s"}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-medium text-ink">{planName[f.planId] ?? f.planId}</div>
                <div className="text-[11px] text-ink-faint">{f.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}</div>
              </div>
            </Link>
          ))
        )}
      </div>
      {total > PAGE_SIZE && (
        <p className="text-xs text-ink-faint">Showing the most recent {PAGE_SIZE}. Refine with search to narrow.</p>
      )}
    </div>
  );
}
