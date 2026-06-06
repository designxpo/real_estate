import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/app-shell";
import { getDictionary } from "@/lib/i18n";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Landlords are external actors — they never see the broker CRM. Bounce them
  // to their own lightweight portal.
  if (user.role === "landlord") redirect("/landlord");
  // Platform-owner suspension: lock the whole firm out until unsuspended.
  const firm = await prisma.firm.findUnique({ where: { id: user.firmId }, select: { suspendedAt: true } });
  if (firm?.suspendedAt) redirect("/suspended");
  const dict = getDictionary(user.preferredLanguage);
  return (
    <AppShell
      user={{ id: user.id, name: user.name, role: user.role }}
      nav={dict.nav}
    >
      {children}
    </AppShell>
  );
}
