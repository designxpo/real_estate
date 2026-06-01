import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { dealVisibility } from "@/lib/scope";
import { dealCreateSchema } from "@/lib/validators";
import { computeBrokerage } from "@/lib/deals";
import { logActivity } from "@/lib/activity";

export async function GET() {
  try {
    const user = await requireUser();
    const deals = await prisma.deal.findMany({
      where: dealVisibility(user),
      include: {
        property: { select: { title: true } },
        buyer: { select: { name: true } },
        primaryBroker: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ deals });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = dealCreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;

    const brokerage = computeBrokerage({
      dealType: d.dealType,
      agreedPrice: d.agreedPrice,
      brokeragePctBuyerSide: d.brokeragePctBuyerSide,
      brokeragePctSellerSide: d.brokeragePctSellerSide,
      rentMonthsBuyerSide: d.rentMonthsBuyerSide,
      rentMonthsSellerSide: d.rentMonthsSellerSide,
    });

    const deal = await prisma.deal.create({
      data: {
        firmId: user.firmId,
        propertyId: d.propertyId,
        buyerContactId: d.buyerContactId,
        sellerContactId: d.sellerContactId || null,
        leadId: d.leadId || null,
        dealType: d.dealType,
        agreedPrice: d.agreedPrice,
        brokeragePctBuyerSide: d.brokeragePctBuyerSide,
        brokeragePctSellerSide: d.brokeragePctSellerSide,
        brokerageAmountBuyer: brokerage.buyer,
        brokerageAmountSeller: brokerage.seller,
        totalBrokerage: brokerage.total,
        tokenAmount: d.tokenAmount,
        tokenDate: d.tokenDate,
        primaryBrokerUserId: d.primaryBrokerUserId || user.id,
        notes: d.notes,
      },
    });
    await logActivity({
      firmId: user.firmId,
      userId: user.id,
      entityType: "deal",
      entityId: deal.id,
      action: "create",
    });
    return NextResponse.json({ deal }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}
