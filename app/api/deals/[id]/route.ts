import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { dealVisibility } from "@/lib/scope";
import { dealUpdateSchema } from "@/lib/validators";
import { computeBrokerage } from "@/lib/deals";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notifications";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const deal = await prisma.deal.findFirst({
      where: { id, ...dealVisibility(user) },
      include: {
        property: { select: { id: true, title: true } },
        buyer: true,
        seller: true,
        primaryBroker: { select: { id: true, name: true } },
        splits: { include: { user: { select: { name: true } } } },
        invoices: true,
      },
    });
    if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ deal });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const existing = await prisma.deal.findFirst({ where: { id, ...dealVisibility(user) } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json().catch(() => null);
    const parsed = dealUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;

    // Recompute brokerage if price/pct changed.
    const recompute =
      d.agreedPrice !== undefined ||
      d.brokeragePctBuyerSide !== undefined ||
      d.brokeragePctSellerSide !== undefined;
    const brokerage = recompute
      ? computeBrokerage({
          dealType: existing.dealType,
          agreedPrice: d.agreedPrice ?? Number(existing.agreedPrice),
          brokeragePctBuyerSide: d.brokeragePctBuyerSide ?? Number(existing.brokeragePctBuyerSide ?? 0),
          brokeragePctSellerSide: d.brokeragePctSellerSide ?? Number(existing.brokeragePctSellerSide ?? 0),
        })
      : null;

    const deal = await prisma.$transaction(async (tx) => {
      const u = await tx.deal.update({
        where: { id },
        data: {
          stage: d.stage,
          agreedPrice: d.agreedPrice,
          brokeragePctBuyerSide: d.brokeragePctBuyerSide,
          brokeragePctSellerSide: d.brokeragePctSellerSide,
          tokenAmount: d.tokenAmount,
          tokenDate: d.tokenDate,
          notes: d.notes,
          cancelledReason: d.cancelledReason,
          ...(brokerage
            ? {
                brokerageAmountBuyer: brokerage.buyer,
                brokerageAmountSeller: brokerage.seller,
                totalBrokerage: brokerage.total,
              }
            : {}),
          // Stage-entry side effects
          ...(d.stage === "agreement" && !existing.agreementDate
            ? { agreementDate: d.agreementDate ?? new Date() }
            : {}),
          ...(d.stage === "registration" && !existing.registrationDate
            ? { registrationDate: d.registrationDate ?? new Date() }
            : {}),
          ...(d.stage === "cancelled" ? { cancelledAt: new Date() } : {}),
        },
      });

      // On registration, all pending splits become payable.
      if (d.stage === "registration" && existing.stage !== "registration") {
        await tx.commissionSplit.updateMany({
          where: { dealId: id, status: "pending" },
          data: { status: "payable" },
        });
      }
      // On cancel, hold any unpaid splits.
      if (d.stage === "cancelled") {
        await tx.commissionSplit.updateMany({
          where: { dealId: id, status: { in: ["pending", "payable"] } },
          data: { status: "on_hold" },
        });
      }
      return u;
    });

    if (d.stage && d.stage !== existing.stage) {
      await logActivity({
        firmId: user.firmId,
        userId: user.id,
        entityType: "deal",
        entityId: id,
        action: "stage_change",
        payload: { from: existing.stage, to: d.stage },
      });
      // Notify split recipients when the deal registers (commissions payable).
      if (d.stage === "registration") {
        const splits = await prisma.commissionSplit.findMany({
          where: { dealId: id, userId: { not: null } },
          select: { userId: true },
        });
        for (const s of splits) {
          if (s.userId) {
            await notify({
              firmId: user.firmId,
              userId: s.userId,
              kind: "commission_payable",
              title: "Commission now payable",
              href: `/deals/${id}`,
            });
          }
        }
      }
    }
    return NextResponse.json({ deal });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
