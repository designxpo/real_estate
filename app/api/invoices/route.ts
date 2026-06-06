import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { dealVisibility } from "@/lib/scope";
import { invoiceCreateSchema } from "@/lib/validators";
import { computeGst, nextInvoiceNumber, HSN_SAC } from "@/lib/invoice";
import { financialYearCode } from "@/lib/fy";
import { logActivity } from "@/lib/activity";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = invoiceCreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;

    const deal = await prisma.deal.findFirst({ where: { id: d.dealId, ...dealVisibility(user) } });
    if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

    const firm = await prisma.firm.findUnique({ where: { id: user.firmId } });
    const invoiceDate = d.invoiceDate ?? new Date();
    const fy = financialYearCode(invoiceDate);
    const prefix = firm?.invoicePrefix || "INV";

    const sameState = Boolean(
      firm?.state && d.billedToState && firm.state.toLowerCase() === d.billedToState.toLowerCase(),
    );
    const gst = computeGst({ base: d.brokerageBase, gstPct: d.gstPct ?? 18, sameState });

    const invoice = await prisma.$transaction(async (tx) => {
      const { invoiceNumber } = await nextInvoiceNumber(tx, user.firmId, fy, prefix);
      return tx.invoice.create({
        data: {
          firmId: user.firmId,
          dealId: d.dealId,
          contactId: d.contactId,
          invoiceNumber,
          invoiceDate,
          fy,
          brokerageBase: d.brokerageBase,
          gstPct: d.gstPct ?? 18,
          cgstAmount: gst.cgst,
          sgstAmount: gst.sgst,
          igstAmount: gst.igst,
          totalAmount: gst.total,
          billedToState: d.billedToState,
          hsnSac: HSN_SAC,
          status: "sent",
          notes: d.notes,
        },
      });
    });
    await logActivity({
      firmId: user.firmId,
      userId: user.id,
      entityType: "invoice",
      entityId: invoice.id,
      action: "create",
    });
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
