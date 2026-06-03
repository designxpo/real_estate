// POST /api/auth/password/login — email OR phone + password sign-in (alt to OTP).
// Generic error messages so we don't leak which accounts exist.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword, homePathForRole } from "@/lib/auth";
import { passwordLoginSchema } from "@/lib/validators";
import { normalizePhone } from "@/lib/utils";
import { logActivity } from "@/lib/activity";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = passwordLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your email or phone and password" }, { status: 400 });
  }
  const { identifier, password } = parsed.data;

  const isEmail = identifier.includes("@");
  const user = isEmail
    ? await prisma.user.findUnique({ where: { email: identifier.toLowerCase() } })
    : await prisma.user.findUnique({ where: { phone: normalizePhone(identifier) } });
  // Always run a compare to keep timing roughly constant even when user missing.
  const ok = user?.passwordHash ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await createSession(user.id);
  await logActivity({
    firmId: user.firmId,
    userId: user.id,
    entityType: "user",
    entityId: user.id,
    action: "login_password",
  });

  return NextResponse.json({ ok: true, redirectTo: homePathForRole(user.role) });
}
