import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { OnboardingWizard } from "@/components/onboarding-wizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const firm = await prisma.firm.findUnique({ where: { id: user.firmId } });
  // Skip if already onboarded — they can come back via Settings.
  if (firm?.onboardedAt) redirect("/home");

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <OnboardingWizard
        firm={{
          name: firm?.name ?? "",
          city: firm?.city ?? "",
          state: firm?.state ?? "",
          reraNumber: firm?.reraNumber ?? "",
          gstNumber: firm?.gstNumber ?? "",
          invoicePrefix: firm?.invoicePrefix ?? "",
        }}
        userName={user.name}
      />
    </div>
  );
}
