// Record a rent payment → issues a receipt number and settles the charge.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { nextReceiptNo } from "@/lib/rent";

const schema = z.object({
  leaseId: z.string().min(1),
  chargeId: z.string().optional().or(z.literal("")),
  amount: z.coerce.number().positive(),
  method: z.enum(["upi", "bank", "cash", "cheque"]),
  reference: z.string().max(120).optional(),
  note: z.string().max(300).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (user.role === "sub_broker") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;

    const lease = await prisma.pmLease.findFirst({ where: { id: d.leaseId, firmId: user.firmId }, select: { id: true } });
    if (!lease) return NextResponse.json({ error: "Lease not found" }, { status: 404 });

    const receiptNo = await nextReceiptNo(user.firmId);
    const paymentId = await prisma.$transaction(async (tx) => {
      const payment = await tx.pmPayment.create({
        data: {
          firmId: user.firmId,
          leaseId: d.leaseId,
          chargeId: d.chargeId || null,
          amount: d.amount,
          method: d.method,
          reference: d.reference || null,
          note: d.note || null,
          receiptNo,
        },
      });
      if (d.chargeId) {
        const charge = await tx.pmRentCharge.findFirst({ where: { id: d.chargeId, firmId: user.firmId } });
        if (charge) {
          const paid = Number(charge.paidAmount) + d.amount;
          const status = paid >= Number(charge.amount) ? "paid" : "partial";
          await tx.pmRentCharge.update({ where: { id: charge.id }, data: { paidAmount: paid, status } });
        }
      }
      return payment.id;
    });

    return NextResponse.json({ ok: true, id: paymentId, receiptNo }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}
