"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/platform", label: "Overview", icon: "▦", exact: true },
  { href: "/platform/firms", label: "Firms", icon: "▣" },
  { href: "/platform/plans", label: "Plans & pricing", icon: "◈" },
];

export function PlatformShell({
  admin,
  children,
}: {
  admin: { email: string; name: string | null };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  async function logout() {
    await fetch("/api/platform/auth/logout", { method: "POST" });
    router.push("/platform/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-app flex flex-col">
      <header className="h-14 flex items-center justify-between border-b border-line px-4 md:px-5">
        <Link href="/platform" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/keya_web.svg" alt="Keya" className="h-6 w-auto" />
          <span className="text-xs text-ink-faint font-medium">Console</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-xs text-ink-muted">{admin.name || admin.email}</span>
          <button onClick={logout} className="text-xs text-ink-muted hover:text-ink">
            Log out
          </button>
        </div>
      </header>

      <div className="flex-1 flex">
        <aside className="hidden md:flex md:flex-col w-56 border-r border-line p-3">
          <nav className="space-y-0.5">
            {NAV.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-inner text-sm transition-colors",
                    active
                      ? "bg-surface-2 text-ink border border-line"
                      : "text-ink-muted hover:text-ink hover:bg-hover border border-transparent"
                  )}
                >
                  <span className={cn("text-base", active ? "text-accent" : "text-ink-faint")}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto p-3 rounded-inner bg-surface-2 border border-line">
            <div className="text-xs text-ink-faint">Operator</div>
            <div className="text-sm font-medium text-ink truncate">{admin.email}</div>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          {/* Mobile nav */}
          <nav className="md:hidden flex gap-1 border-b border-line px-3 py-2 overflow-x-auto">
            {NAV.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "shrink-0 px-3 py-1.5 rounded-full text-xs",
                    active ? "bg-accent text-white" : "text-ink-muted bg-surface-2"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="px-4 md:px-6 py-4 md:py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
