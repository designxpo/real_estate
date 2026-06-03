import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth";
import { FirmKycForm } from "@/components/firm-kyc-form";

export const dynamic = "force-dynamic";

export default async function FirmSettingsPage() {
  const user = await requireUserPage();
  if (user.role !== "owner" && user.role !== "principal") redirect("/settings");
  const firm = await prisma.firm.findUnique({ where: { id: user.firmId } });
  if (!firm) redirect("/settings");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <Link href="/settings" className="hover:text-ink">Settings</Link>
        <span>/</span>
        <span className="text-ink">Firm &amp; KYC</span>
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Firm &amp; KYC</h1>
        <p className="text-sm text-ink-muted">
          Your legal details build trust with owners and are required for RERA/GST compliance.
          Editing resubmits for verification.
        </p>
      </div>
      <FirmKycForm
        firm={{
          name: firm.name,
          firmType: firm.firmType,
          reraNumber: firm.reraNumber,
          reraAuthority: firm.reraAuthority,
          panNumber: firm.panNumber,
          gstNumber: firm.gstNumber,
          address: firm.address,
          city: firm.city,
          state: firm.state,
          pincode: firm.pincode,
          website: firm.website,
          about: firm.about,
        }}
      />
    </div>
  );
}
