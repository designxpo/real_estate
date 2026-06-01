import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { dealVisibility } from "@/lib/scope";
import { splitCreateSchema } from "@/lib/validators";
import { computeSplit } from "@/lib/commission";
import { logActivity } from "@/lib/activity";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const deal = await prisma.deal.findFirst({ where: { id, ...dealVisibility(user) } });
    if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const splits = await prisma.commissionSplit.findMany({
      where: { dealId: id },
      include: { user: { select: { name: true } } },
    });
    return NextResponse.json({ splits });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const deal = await prisma.deal.findFirst({ where: { id, ...dealVisibility(user) } });
    if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json().catch(() => null);
    const parsed = splitCreateSchema.safeParse({ ...body, dealId: id });
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;

    const calc = computeSplit({
      totalBrokerage: Number(deal.totalBrokerage),
      pctOfTotal: d.pctOfTotal,
      amount: d.amount,
      tdsPct: d.tdsPct ?? 0,
    });

    const split = await prisma.commissionSplit.create({
      data: {
        dealId: id,
        userId: d.userId || null,
        externalName: d.externalName,
        externalPhone: d.externalPhone,
        role: d.role,
        pctOfTotal: d.pctOfTotal,
        amount: calc.amount,
        tdsPct: calc.tdsPct,
        tdsAmount: calc.tdsAmount,
        netAmount: calc.netAmount,
        // If the deal already registered, the split is immediately payable.
        status: deal.stage === "registration" || deal.stage === "completed" ? "payable" : "pending",
        notes: d.notes,
      },
    });
    await logActivity({
      firmId: user.firmId,
      userId: user.id,
      entityType: "deal",
      entityId: id,
      action: "split_added",
    });
    return NextResponse.json({ split }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}
