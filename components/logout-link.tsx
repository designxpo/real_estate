"use client";

import { useRouter } from "next/navigation";

export function LogoutLink() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button onClick={logout} className="text-sm text-ink-muted hover:text-ink underline">
      Sign out
    </button>
  );
}
