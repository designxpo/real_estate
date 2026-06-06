import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateOtp, hashOtp } from "@/lib/auth";
import { sendOtpSms } from "@/lib/sms";
import { normalizePhone } from "@/lib/utils";
import { otpStartSchema } from "@/lib/validators";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

const OTP_TTL_MINUTES = 10;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = otpStartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const phone = normalizePhone(parsed.data.phone);

  // Anti-SMS-bombing: cap OTPs per phone (the victim/cost resource) and per IP
  // (best-effort) BEFORE generating/sending anything.
  const byPhone = rateLimit(`otp:broker:phone:${phone}`, 3, 15 * 60 * 1000); // 3 / 15 min
  if (!byPhone.ok) return tooMany(byPhone.retryAfterSec);
  const byIp = rateLimit(`otp:broker:ip:${clientIp(req)}`, 15, 15 * 60 * 1000); // 15 / 15 min
  if (!byIp.ok) return tooMany(byIp.retryAfterSec);

  const code = generateOtp();
  const codeHash = await hashOtp(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpCode.create({ data: { phone, codeHash, expiresAt } });
  await sendOtpSms(phone, code);

  return NextResponse.json({ ok: true, phone });
}
