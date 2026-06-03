// Cancel/downgrade to Free. Existing active bookings are kept; the firm just
// can't start new ones beyond the Free cap.
import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/auth";
import { cancelSubscription } from "@/lib/billing";

export async function POST() {
  try {
    const user = await requireUser();
    if (user.role !== "owner" && user.role !== "principal") {
      return NextResponse.json({ error: "Only the firm owner can change the plan" }, { status: 403 });
    }
    await cancelSubscription(user.firmId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}
