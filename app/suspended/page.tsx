import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { LogoutLink } from "@/components/logout-link";

export const dynamic = "force-dynamic";

// Shown when a firm has been suspended by the platform operator. Not wrapped in
// the app shell so a locked-out firm can't reach any CRM surface.
export default async function SuspendedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const firm = await prisma.firm.findUnique({ where: { id: user.firmId }, select: { suspendedAt: true } });
  // If reinstated, send them back into the app.
  if (!firm?.suspendedAt) redirect("/home");

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-app">
      <div className="max-w-md text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-card bg-negative/15 text-negative text-2xl">⏸</div>
        <h1 className="text-2xl font-semibold text-ink">Account suspended</h1>
        <p className="text-sm text-ink-muted">
          Access to this account has been paused by the platform administrator. If you believe this
          is a mistake, please contact support to resolve any outstanding issues.
        </p>
        <LogoutLink />
      </div>
    </div>
  );
}
