import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth";
import { CopyButton } from "@/components/copy-button";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { DemoDataPanel } from "@/components/demo-data-panel";
import { TeamPanel } from "@/components/team-panel";
import { canSeeAllInFirm } from "@/lib/scope";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUserPage();
  const firm = await prisma.firm.findUnique({ where: { id: user.firmId } });
  const demoCount = await prisma.property.count({ where: { firmId: user.firmId, isDemo: true } });
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const webhookUrl = `${proto}://${host}/api/leads/inbound/${firm?.webhookToken}`;

  return (
    <div className="space-y-5 max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Plans &amp; billing</h2>
            <p className="text-sm text-ink-muted">Manage your marketplace subscription and booking capacity.</p>
          </div>
          <Link href="/billing" className="text-sm px-4 py-2 rounded-inner bg-accent text-white shrink-0">
            View plans
          </Link>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Firm &amp; KYC</h2>
          {(() => {
            const s = firm?.verificationStatus ?? "pending";
            const map: Record<string, string> = {
              verified: "bg-normal-soft text-normal",
              pending: "bg-high-soft text-high",
              rejected: "bg-urgent-soft text-urgent",
            };
            const label = s === "verified" ? "✓ Verified" : s === "rejected" ? "Verification rejected" : "Verification pending";
            return <span className={`text-xs px-2.5 py-1 rounded-full ${map[s] ?? map.pending}`}>{label}</span>;
          })()}
        </div>
        <dl className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
          <dt className="text-ink-faint">Name</dt>
          <dd className="text-ink">{firm?.name}</dd>
          {firm?.firmType && (
            <>
              <dt className="text-ink-faint">Type</dt>
              <dd className="text-ink capitalize">{firm.firmType.replace(/_/g, " ")}</dd>
            </>
          )}
          {(firm?.city || firm?.address) && (
            <>
              <dt className="text-ink-faint">Address</dt>
              <dd className="text-ink">{[firm.address, firm.city, firm.state, firm.pincode].filter(Boolean).join(", ")}</dd>
            </>
          )}
          {firm?.reraNumber && (
            <>
              <dt className="text-ink-faint">RERA</dt>
              <dd className="text-ink font-mono text-xs">{firm.reraNumber}{firm.reraAuthority ? ` · ${firm.reraAuthority}` : ""}</dd>
            </>
          )}
          {firm?.panNumber && (
            <>
              <dt className="text-ink-faint">PAN</dt>
              <dd className="text-ink font-mono text-xs">{firm.panNumber}</dd>
            </>
          )}
          {firm?.gstNumber && (
            <>
              <dt className="text-ink-faint">GSTIN</dt>
              <dd className="text-ink font-mono text-xs">{firm.gstNumber}</dd>
            </>
          )}
          {firm?.website && (
            <>
              <dt className="text-ink-faint">Website</dt>
              <dd className="text-ink text-xs truncate">{firm.website}</dd>
            </>
          )}
          {firm?.invoicePrefix && (
            <>
              <dt className="text-ink-faint">Invoice prefix</dt>
              <dd className="text-ink font-mono text-xs">{firm.invoicePrefix}</dd>
            </>
          )}
        </dl>
        <Link href="/settings/firm" className="inline-block mt-3 text-sm text-accent hover:underline">Edit firm &amp; KYC →</Link>
      </Card>

      {demoCount > 0 && <DemoDataPanel demoCount={demoCount} />}

      <Card>
        <h2 className="font-semibold mb-1">Inbound lead webhook</h2>
        <p className="text-sm text-ink-muted mb-3">
          POST a JSON or form payload with at least <code className="text-xs bg-surface-2 px-1.5 py-0.5 rounded">name</code> and{" "}
          <code className="text-xs bg-surface-2 px-1.5 py-0.5 rounded">phone</code> to this URL.
        </p>
        <div className="flex gap-2 items-center bg-surface-2 border border-line rounded-inner px-3 py-2 mb-3">
          <code className="text-xs flex-1 break-all text-ink">{webhookUrl}</code>
          <CopyButton text={webhookUrl} />
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer text-ink-muted hover:text-ink">Example curl</summary>
          <pre className="mt-2 bg-app text-ink rounded-inner p-3 text-xs overflow-x-auto border border-line">{`curl -X POST '${webhookUrl}' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "name": "Vikram Mehta",
    "phone": "+919900011111",
    "message": "Interested in 3BHK Koramangala",
    "source": "facebook_lead_ads",
    "intent": "buy"
  }'`}</pre>
        </details>
      </Card>

      {canSeeAllInFirm(user.role) && user.role !== "accounts" && <TeamPanel />}

      <Card>
        <h2 className="font-semibold mb-3">You</h2>
        <dl className="grid grid-cols-[80px_1fr] gap-y-2 text-sm mb-4">
          <dt className="text-ink-faint">Name</dt>
          <dd className="text-ink">{user.name}</dd>
          <dt className="text-ink-faint">Phone</dt>
          <dd className="text-ink font-mono">{user.phone}</dd>
          {user.email && (
            <>
              <dt className="text-ink-faint">Email</dt>
              <dd className="text-ink">{user.email}</dd>
            </>
          )}
          <dt className="text-ink-faint">Role</dt>
          <dd><Pill tone="blue" size="xs">{user.role}</Pill></dd>
        </dl>
        <div className="flex items-center gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-ink-faint mb-1.5">Language</div>
            <LanguageSwitcher current={user.preferredLanguage} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-ink-faint mb-1.5">Password</div>
            <Link href="/set-password">
              <Button variant="secondary" size="sm">Set / change password</Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
