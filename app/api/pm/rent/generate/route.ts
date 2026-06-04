// Generate this month's rent charges for all active leases (idempotent).
import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/auth";
import { generateChargesForMonth } from "@/lib/rent";

export async function POST() {
  try {
    const user = await requireUser();
    if (user.role === "sub_broker") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    const created = await generateChargesForMonth(user.firmId);
    return NextResponse.json({ ok: true, created });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}
