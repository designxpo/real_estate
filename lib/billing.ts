// Subscription billing. Provider-agnostic: when no provider keys are set we run
// in DEV mode (a plan is activated directly for testing); when Razorpay keys are
// present, checkout creates a real order and the webhook activates on payment.
//
// Either way, activating a plan sets Firm.maxActiveBookings, which lib/booking.ts
// already enforces at booking time.
import { createHmac } from "crypto";
import { prisma } from "@/lib/db";
import { PLANS, getPlan, FREE_PLAN, type Plan } from "@/lib/plans";

export class BillingError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "BillingError";
  }
}

// True once Razorpay keys are configured — flips checkout from dev to real.
export function isBillingConfigured(): boolean {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export interface FirmBilling {
  plan: Plan;
  status: string;
  renewsAt: Date | null;
  activeBookings: number;
  maxActiveBookings: number;
  remaining: number;
}

export async function getFirmBilling(firmId: string): Promise<FirmBilling> {
  const firm = await prisma.firm.findUnique({
    where: { id: firmId },
    select: { planId: true, subscriptionStatus: true, subscriptionRenewsAt: true, maxActiveBookings: true },
  });
  const plan = getPlan(firm?.planId);
  const activeBookings = await prisma.listingBooking.count({ where: { firmId, status: "active" } });
  const cap = firm?.maxActiveBookings ?? plan.maxActiveBookings;
  return {
    plan,
    status: firm?.subscriptionStatus ?? "active",
    renewsAt: firm?.subscriptionRenewsAt ?? null,
    activeBookings,
    maxActiveBookings: cap,
    remaining: Math.max(0, cap - activeBookings),
  };
}

interface ActivateOpts {
  provider: "dev" | "razorpay" | "stripe";
  orderId?: string;
  paymentId?: string;
}

// Switch a firm to a plan: update the cap + status, and record the transaction.
export async function activatePlan(firmId: string, planId: string, opts: ActivateOpts): Promise<Plan> {
  const plan = getPlan(planId);
  const renewsAt = plan.id === FREE_PLAN.id ? null : new Date(Date.now() + 30 * 86_400_000);
  await prisma.$transaction(async (tx) => {
    await tx.firm.update({
      where: { id: firmId },
      data: {
        planId: plan.id,
        maxActiveBookings: plan.maxActiveBookings,
        subscriptionStatus: "active",
        subscriptionRenewsAt: renewsAt,
      },
    });
    await tx.billingTransaction.create({
      data: {
        firmId,
        planId: plan.id,
        amount: plan.priceMonthly,
        provider: opts.provider,
        providerOrderId: opts.orderId,
        providerPaymentId: opts.paymentId,
        status: "paid",
      },
    });
  });
  return plan;
}

export async function cancelSubscription(firmId: string): Promise<void> {
  await prisma.firm.update({
    where: { id: firmId },
    data: {
      planId: FREE_PLAN.id,
      maxActiveBookings: FREE_PLAN.maxActiveBookings,
      subscriptionStatus: "cancelled",
      subscriptionRenewsAt: null,
    },
  });
}

// --- Razorpay (only used when configured) -----------------------------------

interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

export async function createRazorpayOrder(plan: Plan, firmId: string): Promise<RazorpayOrder> {
  const key = process.env.RAZORPAY_KEY_ID!;
  const secret = process.env.RAZORPAY_KEY_SECRET!;
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(`${key}:${secret}`).toString("base64"),
    },
    body: JSON.stringify({
      amount: plan.priceMonthly * 100, // paise
      currency: "INR",
      notes: { firmId, planId: plan.id },
    }),
  });
  if (!res.ok) throw new BillingError("provider_error", "Could not create the payment order");
  return res.json();
}

// Verify a Razorpay webhook payload against the shared secret.
export function verifyRazorpayWebhook(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return expected === signature;
}

export { PLANS };
