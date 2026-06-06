// PATCH /api/firm — update the firm's profile + KYC/legal details. Owner/principal
// only. Editing KYC does not auto-verify; an admin/automated check sets "verified".
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  name: z.string().min(2).max(200).optional(),
  firmType: z.enum(["proprietorship", "partnership", "llp", "pvt_ltd", "individual_agent"]).optional().or(z.literal("")),
  reraNumber: z.string().max(60).optional(),
  reraAuthority: z.string().max(120).optional(),
  panNumber: z.string().max(20).optional(),
  gstNumber: z.string().max(20).optional(),
  address: z.string().max(400).optional(),
  city: z.string().max(120).optional(),
  state: z.string().max(120).optional(),
  pincode: z.string().max(6).optional(),
  website: z.string().max(200).optional(),
  about: z.string().max(2000).optional(),
  upiVpa: z.string().max(120).optional(),
});

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    if (user.role !== "owner" && user.role !== "principal") {
      return NextResponse.json({ error: "Only the firm owner can edit firm details" }, { status: 403 });
    }
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;

    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(d)) {
      if (v === undefined) continue;
      if (k === "panNumber" || k === "gstNumber") data[k] = v ? (v as string).toUpperCase() : null;
      else data[k] = v === "" ? null : v;
    }

    await prisma.firm.update({ where: { id: user.firmId }, data });
    await logActivity({ firmId: user.firmId, userId: user.id, entityType: "firm", entityId: user.firmId, action: "update_kyc" });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
