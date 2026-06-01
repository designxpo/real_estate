import { prisma } from "@/lib/db";
import { generateOtp, hashOtp } from "@/lib/auth";
import { sendOtpSms } from "@/lib/sms";
import { normalizePhone } from "@/lib/utils";
import { ownerOtpStartSchema } from "@/lib/owner-validators";
import { ok, fail, preflight } from "@/lib/owner-api";

const OTP_TTL_MINUTES = 10;

export function OPTIONS() {
  return preflight();
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = ownerOtpStartSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid request", 400, parsed.error.flatten());

  const phone = normalizePhone(parsed.data.phone);
  const code = generateOtp();
  const codeHash = await hashOtp(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpCode.create({ data: { phone, codeHash, expiresAt } });
  await sendOtpSms(phone, code);

  // Never leak the code in prod. In dev it's logged to the server console.
  return ok({ ok: true, phone, expiresInSeconds: OTP_TTL_MINUTES * 60 });
}
