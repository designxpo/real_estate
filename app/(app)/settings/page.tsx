import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth";
import { CopyButton } from "@/components/copy-button";
import { ALL_PORTALS, getAdapter } from "@/lib/portals";
import Link from "next/link";
import { PortalCredentialsPanel } from "@/components/portal-credentials-panel";
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
        <h2 className="font-semibold mb-3">Firm</h2>
        <dl className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
          <dt className="text-ink-faint">Name</dt>
          <dd className="text-ink">{firm?.name}</dd>
          {firm?.city && (
            <>
              <dt className="text-ink-faint">City</dt>
              <dd className="text-ink">{firm.city}{firm.state ? `, ${firm.state}` : ""}</dd>
            </>
          )}
          {firm?.reraNumber && (
            <>
              <dt className="text-ink-faint">RERA</dt>
              <dd className="text-ink font-mono text-xs">{firm.reraNumber}</dd>
            </>
          )}
          {firm?.gstNumber && (
            <>
              <dt className="text-ink-faint">GSTIN</dt>
              <dd className="text-ink font-mono text-xs">{firm.gstNumber}</dd>
            </>
          )}
          {firm?.invoicePrefix && (
            <>
              <dt className="text-ink-faint">Invoice prefix</dt>
              <dd className="text-ink font-mono text-xs">{firm.invoicePrefix}</dd>
            </>
          )}
        </dl>
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

      <Card>
        <div className="mb-3">
          <h2 className="font-semibold">Portal feed URLs</h2>
          <p className="text-sm text-ink-muted">
            Each portal pulls listings from a unique URL on their own cadence. No push needed.
          </p>
        </div>
        <div className="rounded-inner border border-line divide-y divide-line">
          {ALL_PORTALS.map((p) => {
            const adapter = getAdapter(p.id);
            const ext = adapter?.fileExtension() ?? "xml";
            const slug =
              p.id === "ninetynine_acres" ? "99acres" : p.id === "custom_csv" ? "custom" : p.id;
            const url = `${proto}://${host}/feeds/${firm?.webhookToken}/${slug}.${ext}`;
            return (
              <div key={p.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-ink">{p.displayName}</div>
                  <code className="text-xs text-ink-faint break-all">{url}</code>
                </div>
                <CopyButton text={url} />
              </div>
            );
          })}
        </div>
      </Card>

      <PortalCredentialsPanel />

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
