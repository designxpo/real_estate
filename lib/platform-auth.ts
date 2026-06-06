// Platform-owner (super-admin) auth. A DELIBERATELY SEPARATE principal from the
// broker User/Session system: its own table (PlatformAdmin), its own cookie
// (`platform_session`), its own helpers. A broker session never grants platform
// access and vice-versa. Mirrors the cookie-JWT pattern in lib/auth.ts.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { randomBytes, createHash } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { PlatformAdmin } from "@prisma/client";
import { AuthError } from "@/lib/auth";

const COOKIE_NAME = "platform_session";
const SESSION_TTL_DAYS = 14; // shorter than broker sessions — this is god mode

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET must be set to a 32+ char string");
  }
  // Domain-separate from broker JWTs so a broker token can never verify here.
  return new TextEncoder().encode(s + ":platform");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Idempotent first-admin bootstrap. If PLATFORM_ADMIN_EMAIL + _PASSWORD are set
// and no admin with that email exists yet, create it. Lets you log in on a fresh
// deploy with zero manual DB steps. Safe to call on every login attempt.
export async function ensureSeedAdmin(): Promise<void> {
  const email = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.PLATFORM_ADMIN_PASSWORD;
  if (!email || !password) return;
  const existing = await prisma.platformAdmin.findUnique({ where: { email } });
  if (existing) return;
  await prisma.platformAdmin.create({
    data: {
      email,
      name: process.env.PLATFORM_ADMIN_NAME || "Platform Owner",
      passwordHash: await hashPassword(password),
    },
  });
}

export async function createPlatformSession(adminId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.platformSession.create({ data: { adminId, tokenHash, expiresAt } });

  const jwt = await new SignJWT({ sid: tokenHash })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${SESSION_TTL_DAYS}d`)
    .setIssuedAt()
    .sign(secret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    domain: process.env.SESSION_COOKIE_DOMAIN || undefined,
  });
  return jwt;
}

export async function destroyPlatformSession(): Promise<void> {
  const cookieStore = await cookies();
  const jwt = cookieStore.get(COOKIE_NAME)?.value;
  if (jwt) {
    try {
      const { payload } = await jwtVerify(jwt, secret());
      if (payload.sid && typeof payload.sid === "string") {
        await prisma.platformSession.deleteMany({ where: { tokenHash: payload.sid } });
      }
    } catch {
      /* ignore */
    }
  }
  cookieStore.delete(COOKIE_NAME);
}

export async function getPlatformAdmin(): Promise<PlatformAdmin | null> {
  const cookieStore = await cookies();
  const jwt = cookieStore.get(COOKIE_NAME)?.value;
  if (!jwt) return null;
  try {
    const { payload } = await jwtVerify(jwt, secret());
    const sid = typeof payload.sid === "string" ? payload.sid : null;
    if (!sid) return null;
    const session = await prisma.platformSession.findUnique({
      where: { tokenHash: sid },
      include: { admin: true },
    });
    if (!session || session.expiresAt < new Date()) return null;
    return session.admin;
  } catch {
    return null;
  }
}

// For API routes: throws AuthError (handlers catch → 401).
export async function requirePlatformAdmin(): Promise<PlatformAdmin> {
  const a = await getPlatformAdmin();
  if (!a) throw new AuthError("UNAUTHENTICATED");
  return a;
}

// For Server Component PAGES: redirects to the platform login.
export async function requirePlatformAdminPage(): Promise<PlatformAdmin> {
  const a = await getPlatformAdmin();
  if (!a) redirect("/platform/login");
  return a;
}
