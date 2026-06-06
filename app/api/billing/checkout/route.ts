// Start an upgrade. Dev mode (no provider keys): activate the plan immediately so
// the flow is testable. Configured: create a Razorpay order for the client to pay;
// the webhook activates the plan on success.
import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireUser } from "@/lib/auth";
import { getPlan } from "@/lib/plans";
import { isBillingConfigured, createRazorpayOrder, activatePlan, BillingError } from "@/lib/billing";

const schema = z.object({ planId: z.string().min(1) });

function canManageBilling(role: string) {
  return role === "owner" || role === "principal";
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!canManageBilling(user.role)) {
      return NextResponse.json({ error: "Only the firm owner can change the plan" }, { status: 403 });
    }
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const plan = await getPlan(parsed.data.planId);

    // Free plan = downgrade, no payment.
    if (plan.priceMonthly === 0) {
      await activatePlan(user.firmId, plan.id, { provider: "dev" });
      return NextResponse.json({ provider: "dev", activated: true });
    }

    if (!isBillingConfigured()) {
      // DEV: activate immediately (no real charge).
      await activatePlan(user.firmId, plan.id, { provider: "dev" });
      return NextResponse.json({ provider: "dev", activated: true });
    }

    const order = await createRazorpayOrder(plan, user.firmId);
    return NextResponse.json({
      provider: "razorpay",
      keyId: process.env.RAZORPAY_KEY_ID,
      order,
      plan: { id: plan.id, name: plan.name, amount: plan.priceMonthly },
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    if (e instanceof BillingError) return NextResponse.json({ error: e.message, code: e.code }, { status: 502 });
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
