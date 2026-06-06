// Platform-owner login. Bootstraps the seed admin from env (idempotent), then
// verifies email+password and issues a platform_session cookie.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ensureSeedAdmin, verifyPassword, createPlatformSession } from "@/lib/platform-auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password" }, { status: 400 });
  }
  await ensureSeedAdmin();

  const email = parsed.data.email.trim().toLowerCase();
  const admin = await prisma.platformAdmin.findUnique({ where: { email } });
  // Constant-ish failure: same message whether the email or password is wrong.
  const ok = admin ? await verifyPassword(parsed.data.password, admin.passwordHash) : false;
  if (!admin || !ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await createPlatformSession(admin.id);
  await prisma.platformAdmin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  return NextResponse.json({ ok: true });
}
