import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth";
import { BroadcastComposer } from "@/components/broadcast-composer";

export const dynamic = "force-dynamic";

export default async function BroadcastPage() {
  const user = await requireUserPage();
  if (user.role === "sub_broker") redirect("/home");

  const recent = await prisma.broadcast.findMany({
    where: { firmId: user.firmId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Broadcast</h1>
        <p className="text-sm text-ink-muted">Send a segmented message to tenants, leads, or your sub-brokers. Personalise with merge tags.</p>
      </div>

      <BroadcastComposer />

      <section>
        <h2 className="font-semibold mb-3">Recent broadcasts</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-ink-faint">No broadcasts sent yet.</p>
        ) : (
          <div className="divide-y divide-line border border-line rounded-lg">
            {recent.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="text-sm text-ink truncate">{b.body}</div>
                  <div className="text-xs text-ink-muted">
                    {b.segment}{b.filter ? ` · ${b.filter}` : ""} · {b.channel} · {b.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </div>
                </div>
                <div className="text-xs text-ink-muted shrink-0 tabular-nums">{b.sentCount}/{b.totalCount} sent</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
