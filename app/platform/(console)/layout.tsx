import { requirePlatformAdminPage } from "@/lib/platform-auth";
import { PlatformShell } from "@/components/platform-shell";

export const dynamic = "force-dynamic";

export default async function PlatformConsoleLayout({ children }: { children: React.ReactNode }) {
  const admin = await requirePlatformAdminPage();
  return (
    <PlatformShell admin={{ email: admin.email, name: admin.name }}>
      {children}
    </PlatformShell>
  );
}
