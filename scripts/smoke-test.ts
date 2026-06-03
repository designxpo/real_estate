// Touches every Prisma model with a representative query.
// Run with: npx tsx scripts/smoke-test.ts
// If anything is mismatched between schema + runtime client + DB, this fails.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const checks: Array<[string, () => Promise<unknown>]> = [
    ["firm: count + onboardedAt filter", () => prisma.firm.count({ where: { onboardedAt: null } })],
    ["user: preferredLanguage filter", () => prisma.user.count({ where: { preferredLanguage: "en" } })],
    ["contact: isDemo filter + whatsappOptIn", () =>
      prisma.contact.count({ where: { isDemo: false, whatsappOptIn: true } })],
    ["property: isDemo + publicSlug + publicEnabled", () =>
      prisma.property.count({ where: { isDemo: false, publicEnabled: true } })],
    ["lead: isDemo filter", () => prisma.lead.count({ where: { isDemo: false } })],
    ["deal: isDemo filter", () => prisma.deal.count({ where: { isDemo: false } })],
    ["commissionSplit: nested deal.isDemo", () =>
      prisma.commissionSplit.count({ where: { deal: { isDemo: false } } })],
    ["invoice: list", () => prisma.invoice.count()],
    ["invoiceCounter: composite unique", () => prisma.invoiceCounter.findMany({ take: 1 })],
    ["waTemplate: list", () => prisma.waTemplate.count()],
    ["waMessage: outbound count", () => prisma.waMessage.count({ where: { direction: "outbound" } })],
    ["notification: unread count", () => prisma.notification.count({ where: { readAt: null } })],
    ["activityLog: list", () => prisma.activityLog.count()],
    ["siteVisit: scheduled count", () => prisma.siteVisit.count({ where: { status: "scheduled" } })],
    ["session: list", () => prisma.session.count()],
    ["otpCode: unconsumed count", () => prisma.otpCode.count({ where: { consumed: false } })],
    ["propertyPhoto: list", () => prisma.propertyPhoto.count()],
  ];

  let passed = 0;
  let failed = 0;
  for (const [label, fn] of checks) {
    try {
      const r = await fn();
      console.log(`  ✓ ${label} → ${r}`);
      passed++;
    } catch (e) {
      console.error(`  ✗ ${label}: ${(e as Error).message.split("\n")[0]}`);
      failed++;
    }
  }
  console.log(`\n${passed}/${checks.length} passed${failed ? `, ${failed} failed` : ""}`);
  process.exit(failed ? 1 : 0);
}

main().finally(() => prisma.$disconnect());
