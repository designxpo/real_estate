import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { splitUpdateSchema } from "@/lib/validators";
import { computeSplit } from "@/lib/commission";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notifications";

// Verify the split belongs to a deal in the user's firm.
async function ownedSplit(firmId: string, splitId: string) {
  const split = await prisma.commissionSplit.findUnique({
    where: { id: splitId },
    include: { deal: { select: { firmId: true, totalBrokerage: true } } },
  });
  if (!split || split.deal.firmId !== firmId) return null;
  return split;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const split = await ownedSplit(user.firmId, id);
    if (!split) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json().catch(() => null);
    const parsed = splitUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;

    // Recompute amounts if pct/amount/tds changed.
    const recompute = d.pctOfTotal !== undefined || d.amount !== undefined || d.tdsPct !== undefined;
    const calc = recompute
      ? computeSplit({
          totalBrokerage: Number(split.deal.totalBrokerage),
          pctOfTotal: d.pctOfTotal ?? (split.pctOfTotal != null ? Number(split.pctOfTotal) : null),
          amount: d.amount ?? Number(split.amount),
          tdsPct: d.tdsPct ?? Number(split.tdsPct),
        })
      : null;

    const updated = await prisma.commissionSplit.update({
      where: { id },
      data: {
        status: d.status,
        paymentMethod: d.paymentMethod,
        paymentReference: d.paymentReference,
        paidAt: d.status === "paid" ? d.paidAt ?? new Date() : d.paidAt,
        pctOfTotal: d.pctOfTotal,
        notes: d.notes,
        ...(calc ? { amount: calc.amount, tdsPct: calc.tdsPct, tdsAmount: calc.tdsAmount, netAmount: calc.netAmount } : {}),
      },
    });

    if (d.status === "paid" && split.status !== "paid" && updated.userId) {
      await notify({
        firmId: user.firmId,
        userId: updated.userId,
        kind: "commission_paid",
        title: "Commission paid",
        href: `/deals/${split.dealId}`,
      });
    }
    await logActivity({
      firmId: user.firmId,
      userId: user.id,
      entityType: "split",
      entityId: id,
      action: d.status ? `status_${d.status}` : "update",
    });
    return NextResponse.json({ split: updated });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const split = await ownedSplit(user.firmId, id);
    if (!split) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.commissionSplit.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
