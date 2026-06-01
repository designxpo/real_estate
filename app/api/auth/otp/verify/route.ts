import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, verifyOtpHash } from "@/lib/auth";
import { otpVerifySchema } from "@/lib/validators";
import { normalizePhone } from "@/lib/utils";
import { logActivity } from "@/lib/activity";

const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = otpVerifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const phone = normalizePhone(parsed.data.phone);

  const otp = await prisma.otpCode.findFirst({
    where: { phone, consumed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) {
    return NextResponse.json({ error: "OTP expired or not found" }, { status: 400 });
  }
  if (otp.attempts >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  const ok = await verifyOtpHash(parsed.data.code, otp.codeHash);
  if (!ok) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
  }

  await prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });

  // Find or create user. First-time login: create firm + user as owner.
  let user = await prisma.user.findUnique({ where: { phone } });
  const isNewUser = !user;
  if (!user) {
    const name = parsed.data.name?.trim() || "New User";
    const firmName = parsed.data.firmName?.trim() || `${name}'s Firm`;
    const created = await prisma.$transaction(async (tx) => {
      const firm = await tx.firm.create({ data: { name: firmName } });
      const newUser = await tx.user.create({
        data: { firmId: firm.id, name, phone, role: "owner" },
      });
      await tx.firm.update({ where: { id: firm.id }, data: { ownerUserId: newUser.id } });
      return newUser;
    });
    user = created;
    await logActivity({
      firmId: user.firmId,
      userId: user.id,
      entityType: "user",
      entityId: user.id,
      action: "signup",
    });
  }

  await createSession(user.id);
  await logActivity({
    firmId: user.firmId,
    userId: user.id,
    entityType: "user",
    entityId: user.id,
    action: "login",
  });

  return NextResponse.json({ ok: true, userId: user.id, firmId: user.firmId, isNewUser });
}
