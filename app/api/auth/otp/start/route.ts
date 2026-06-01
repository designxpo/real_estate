import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateOtp, hashOtp } from "@/lib/auth";
import { sendOtpSms } from "@/lib/sms";
import { normalizePhone } from "@/lib/utils";
import { otpStartSchema } from "@/lib/validators";

const OTP_TTL_MINUTES = 10;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = otpStartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const phone = normalizePhone(parsed.data.phone);
  const code = generateOtp();
  const codeHash = await hashOtp(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpCode.create({ data: { phone, codeHash, expiresAt } });
  await sendOtpSms(phone, code);

  return NextResponse.json({ ok: true, phone });
}
