"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { NotificationsBell } from "@/components/notifications-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { ToastProvider } from "@/components/ui/toast";
import { Pill } from "@/components/ui/pill";

type NavLabels = {
  home: string;
  properties: string;
  marketplace: string;
  leads: string;
  myLeads: string;
  deals: string;
  ops: string;
  broadcast: string;
  contacts: string;
  whatsapp: string;
  analytics: string;
  reports: string;
  settings: string;
  logout: string;
};

const NAV_ITEMS: Array<{
  href: string;
  key: keyof NavLabels;
  icon: string;
  badge?: "new" | "pro";
  // Roles that should NOT see this item (others see it).
  hideFor?: string[];
}> = [
  { href: "/home", key: "home", icon: "◉" },
  { href: "/my-leads", key: "myLeads", icon: "◉" },
  { href: "/properties", key: "properties", icon: "▣" },
  { href: "/marketplace", key: "marketplace", icon: "◫", badge: "new" },
  { href: "/leads", key: "leads", icon: "◎" },
  { href: "/deals", key: "deals", icon: "◈" },
  { href: "/ops", key: "ops", icon: "▦", badge: "new", hideFor: ["sub_broker"] },
  { href: "/broadcast", key: "broadcast", icon: "◓", hideFor: ["sub_broker"] },
  { href: "/contacts", key: "contacts", icon: "○" },
  { href: "/whatsapp", key: "whatsapp", icon: "◐", badge: "new" },
  // Firm-wide analytics & reports are management views — hide from sub-brokers.
  { href: "/analytics", key: "analytics", icon: "▤", hideFor: ["sub_broker"] },
  { href: "/reports/commissions", key: "reports", icon: "▥", hideFor: ["sub_broker"] },
  { href: "/settings", key: "settings", icon: "◇" },
];

// Mobile bottom nav: pick the 4 highest-traffic items
const MOBILE_NAV = NAV_ITEMS.filter((i) => ["home", "leads", "deals", "properties"].includes(i.key));

export function AppShell({
  user,
  nav,
  children,
}: {
  user: { id: string; name: string; role: string };
  nav: NavLabels;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Role-aware nav: hide management-only views from sub-brokers.
  const navItems = NAV_ITEMS.filter((i) => !i.hideFor?.includes(user.role));
  const mobileNav = navItems.filter((i) =>
    ["home", "myLeads", "leads", "deals", "properties"].includes(i.key)
  ).slice(0, 4);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/home") return pathname === "/home";
    // Marketplace discovery spans more than /marketplace: the map search (/search)
    // and listing detail pages (/listings/[id]) are reached from it and belong to
    // the same section, so keep "Marketplace" selected on those routes too.
    if (href === "/marketplace") {
      return ["/marketplace", "/search", "/listings"].some(
        (p) => pathname === p || pathname.startsWith(p + "/")
      );
    }
    return pathname === href || pathname.startsWith(href + "/");
  }

  const initials = user.name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <ToastProvider>
      <div className="min-h-screen bg-app">
        <div className="min-h-screen bg-app overflow-hidden flex flex-col">
          {/* Top bar */}
          <header className="h-14 flex items-center justify-between border-b border-line px-4 md:px-5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen((x) => !x)}
                className="md:hidden text-ink-muted text-lg w-8 h-8 rounded-full hover:bg-hover"
                aria-label="Menu"
              >
                ☰
              </button>
              <Link href="/home" className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-accent to-accent-glow flex items-center justify-center text-white font-bold text-sm">
                  B
                </div>
                <span className="font-semibold text-ink tracking-tight hidden sm:block">Broker</span>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <NotificationsBell />
              <div className="flex items-center gap-2 pl-2 ml-1 border-l border-line">
                <div className="w-8 h-8 rounded-full bg-surface-2 border border-line flex items-center justify-center text-xs font-semibold text-ink">
                  {initials}
                </div>
                <button
                  onClick={logout}
                  className="hidden md:block text-xs text-ink-muted hover:text-ink"
                >
                  {nav.logout}
                </button>
              </div>
            </div>
          </header>

          <div className="flex-1 flex">
            {/* Sidebar (md+) */}
            <aside className="hidden md:flex md:flex-col w-60 border-r border-line p-3">
              <nav className="space-y-0.5 flex-1">
                {navItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center justify-between gap-2 px-3 py-2 rounded-inner text-sm transition-colors",
                        active
                          ? "bg-surface-2 text-ink border border-line"
                          : "text-ink-muted hover:text-ink hover:bg-hover border border-transparent"
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <span className={cn("text-base", active ? "text-accent" : "text-ink-faint")}>
                          {item.icon}
                        </span>
                        {nav[item.key]}
                      </span>
                      {item.badge && (
                        <Pill tone={item.badge === "new" ? "red" : "blue"} size="xs">
                          {item.badge}
                        </Pill>
                      )}
                    </Link>
                  );
                })}
              </nav>
              <div className="mt-3 p-3 rounded-inner bg-surface-2 border border-line">
                <div className="text-xs text-ink-faint">Signed in as</div>
                <div className="text-sm font-medium text-ink truncate">{user.name}</div>
                <div className="text-xs text-ink-muted capitalize">{user.role}</div>
              </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 min-w-0 pb-24 md:pb-6">
              <div className="px-4 md:px-6 py-4 md:py-6">{children}</div>
            </main>
          </div>

          {/* Mobile slide-out menu */}
          {mobileMenuOpen && (
            <div className="md:hidden fixed inset-0 z-50 bg-black/60" onClick={() => setMobileMenuOpen(false)}>
              <div
                className="absolute left-0 top-0 bottom-0 w-72 bg-surface border-r border-line p-4 animate-slideUp"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-0.5">
                  {navItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-inner text-sm",
                          active
                            ? "bg-surface-2 text-ink border border-line"
                            : "text-ink-muted"
                        )}
                      >
                        <span className={cn("text-base", active ? "text-accent" : "text-ink-faint")}>
                          {item.icon}
                        </span>
                        {nav[item.key]}
                      </Link>
                    );
                  })}
                </div>
                <button
                  onClick={logout}
                  className="mt-6 text-xs text-ink-muted hover:text-ink"
                >
                  {nav.logout}
                </button>
              </div>
            </div>
          )}

          {/* Bottom nav (mobile) */}
          <nav className="md:hidden fixed bottom-0 inset-x-0 bg-app/95 backdrop-blur border-t border-line flex z-40">
            {mobileNav.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex-1 flex flex-col items-center py-2.5 text-[10px] leading-tight transition-colors",
                    active ? "text-accent" : "text-ink-muted"
                  )}
                >
                  <span className="text-lg">{item.icon}</span>
                  {nav[item.key]}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </ToastProvider>
  );
}
