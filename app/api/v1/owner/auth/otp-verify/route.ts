import { prisma } from "@/lib/db";
import { verifyOtpHash } from "@/lib/auth";
import { issueTokens } from "@/lib/owner-auth";
import { normalizePhone } from "@/lib/utils";
import { ownerOtpVerifySchema } from "@/lib/owner-validators";
import { ok, fail, preflight } from "@/lib/owner-api";

const MAX_ATTEMPTS = 5;

export function OPTIONS() {
  return preflight();
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = ownerOtpVerifySchema.safeParse(body);
  if (!parsed.success) return fail("Invalid request", 400, parsed.error.flatten());

  const phone = normalizePhone(parsed.data.phone);

  const otp = await prisma.otpCode.findFirst({
    where: { phone, consumed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return fail("OTP expired or not found", 400);
  if (otp.attempts >= MAX_ATTEMPTS) return fail("Too many attempts", 429);

  const valid = await verifyOtpHash(parsed.data.code, otp.codeHash);
  if (!valid) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return fail("Invalid OTP", 400);
  }
  await prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });

  // Find or create the owner. First OTP verification doubles as signup.
  let owner = await prisma.owner.findUnique({ where: { phone } });
  const isNewOwner = !owner;
  if (!owner) {
    owner = await prisma.owner.create({
      data: { phone, name: parsed.data.name?.trim() || "Owner" },
    });
  }

  const tokens = await issueTokens(owner.id, parsed.data.device);
  return ok({
    ...tokens,
    isNewOwner,
    owner: { id: owner.id, name: owner.name, phone: owner.phone, verified: !!owner.verifiedAt },
  });
}
