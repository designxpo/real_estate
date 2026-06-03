// Razorpay webhook: on a successful payment, activate the plan recorded in the
// order's notes. Signature-verified; raw body required for the HMAC.
import { NextResponse } from "next/server";
import { verifyRazorpayWebhook, activatePlan } from "@/lib/billing";

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  if (!verifyRazorpayWebhook(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string; notes?: { firmId?: string; planId?: string } } } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  if (event.event === "payment.captured" || event.event === "order.paid") {
    const entity = event.payload?.payment?.entity;
    const notes = entity?.notes;
    if (notes?.firmId && notes?.planId) {
      await activatePlan(notes.firmId, notes.planId, {
        provider: "razorpay",
        orderId: entity?.order_id,
        paymentId: entity?.id,
      });
    }
  }
  return NextResponse.json({ ok: true });
}
