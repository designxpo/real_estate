import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth";
import { dealVisibility } from "@/lib/scope";
import { DEAL_STAGE_LABELS, DEAL_STAGE_COLORS } from "@/lib/deals";
import { DealActions } from "@/components/deal-actions";
import { SplitBuilder } from "@/components/split-builder";
import { InvoiceSection } from "@/components/invoice-section";

export const dynamic = "force-dynamic";

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUserPage();
  const deal = await prisma.deal.findFirst({
    where: { id, ...dealVisibility(user) },
    include: {
      property: { select: { id: true, title: true } },
      marketplaceListing: { select: { id: true, title: true } },
      buyer: { select: { id: true, name: true } },
      seller: { select: { name: true } },
      splits: { include: { user: { select: { name: true } } } },
      invoices: true,
    },
  });
  if (!deal) notFound();

  const subjectTitle = deal.property?.title ?? deal.marketplaceListing?.title ?? "Deal";
  const subjectHref = deal.property
    ? `/properties/${deal.property.id}`
    : deal.marketplaceListing
      ? `/listings/${deal.marketplaceListing.id}`
      : null;

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <Link href="/deals" className="text-sm text-ink-muted hover:text-ink">← Deals</Link>
        <div className="flex items-center gap-3 mt-1">
          {subjectHref ? (
            <Link href={subjectHref} className="text-2xl font-semibold hover:text-accent">{subjectTitle}</Link>
          ) : (
            <h1 className="text-2xl font-semibold">{subjectTitle}</h1>
          )}
          <span className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${DEAL_STAGE_COLORS[deal.stage]}`}>
            {DEAL_STAGE_LABELS[deal.stage]}
          </span>
        </div>
        {deal.marketplaceListing && <div className="text-xs text-ink-muted mt-1">From marketplace</div>}
      </div>

      <div className="bg-surface border border-line rounded-lg p-4 grid grid-cols-2 gap-3 text-sm">
        <div><div className="text-ink-faint text-xs">Buyer</div>{deal.buyer.name}</div>
        <div><div className="text-ink-faint text-xs">Seller</div>{deal.seller?.name ?? "—"}</div>
        <div><div className="text-ink-faint text-xs">Agreed price</div>₹{Number(deal.agreedPrice).toLocaleString("en-IN")}</div>
        <div><div className="text-ink-faint text-xs">Total brokerage</div>₹{Number(deal.totalBrokerage).toLocaleString("en-IN")}</div>
      </div>

      <DealActions dealId={deal.id} stage={deal.stage} />

      <SplitBuilder
        dealId={deal.id}
        totalBrokerage={Number(deal.totalBrokerage)}
        splits={deal.splits.map((s) => ({
          id: s.id,
          userName: s.user?.name ?? null,
          externalName: s.externalName,
          role: s.role,
          amount: Number(s.amount),
          tdsAmount: Number(s.tdsAmount),
          netAmount: Number(s.netAmount),
          status: s.status,
        }))}
      />

      <InvoiceSection
        dealId={deal.id}
        contactId={deal.buyer.id}
        defaultBase={Number(deal.totalBrokerage)}
        invoices={deal.invoices.map((i) => ({ id: i.id, invoiceNumber: i.invoiceNumber, totalAmount: Number(i.totalAmount), status: i.status }))}
      />
    </div>
  );
}
