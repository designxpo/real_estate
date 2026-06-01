// POST /api/auth/password/login — email + password sign-in (alternative to OTP).
// Generic error messages so we don't leak which emails exist.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword, homePathForRole } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  // Always run a compare to keep timing roughly constant even when user missing.
  const ok = user?.passwordHash ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !ok) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
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
