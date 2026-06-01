import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { SetPasswordForm } from "@/components/set-password-form";

export const dynamic = "force-dynamic";

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { new: isNew } = await searchParams;
  const full = await prisma.user.findUnique({ where: { id: user.id } });
  const hasPassword = !!full?.passwordHash;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-card bg-gradient-to-br from-accent to-accent-glow mb-3 text-white font-bold text-xl">
            🔐
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isNew ? `Welcome, ${user.name.split(" ")[0]}` : "Set a password"}
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            {isNew
              ? "Create a password so you can sign in with email next time."
              : "Choose a password for email sign-in."}
          </p>
        </div>
        <SetPasswordForm role={user.role} requireCurrent={hasPassword && !isNew} />
      </div>
    </div>
  );
}
