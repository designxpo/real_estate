import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { randomBytes, createHash } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { Role, User } from "@prisma/client";

const COOKIE_NAME = "broker_session";
const SESSION_TTL_DAYS = 30;

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET must be set to a 32+ char string");
  }
  return new TextEncoder().encode(s);
}

export function generateOtp(): string {
  // Fixed test code so testers can sign in without a live SMS provider.
  // Active automatically in non-production, OR in production when OTP_TEST_MODE=true
  // (a staging/testing deploy). ⚠️ MUST be turned off before real launch — once an
  // SMS provider is live, set OTP_TEST_MODE=false (or unset) so codes are random.
  if (process.env.NODE_ENV !== "production" || process.env.OTP_TEST_MODE === "true") {
    return process.env.OTP_TEST_CODE || "123456";
  }
  // 6-digit, leading zeros allowed
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
}

export async function hashOtp(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

export async function verifyOtpHash(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}

// --- Email / password (optional, alongside phone-OTP) -----------------------
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Where a user lands after authenticating, by role.
export function homePathForRole(role: Role): string {
  switch (role) {
    case "landlord":
      return "/landlord";
    case "sub_broker":
      return "/my-leads";
    case "accounts":
      return "/reports/commissions";
    default:
      return "/home"; // owner, principal
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { userId, tokenHash, expiresAt } });

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

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const jwt = cookieStore.get(COOKIE_NAME)?.value;
  if (jwt) {
    try {
      const { payload } = await jwtVerify(jwt, secret());
      if (payload.sid && typeof payload.sid === "string") {
        await prisma.session.deleteMany({ where: { tokenHash: payload.sid } });
      }
    } catch {
      /* ignore */
    }
  }
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const jwt = cookieStore.get(COOKIE_NAME)?.value;
  if (!jwt) return null;
  try {
    const { payload } = await jwtVerify(jwt, secret());
    const sid = typeof payload.sid === "string" ? payload.sid : null;
    if (!sid) return null;
    const session = await prisma.session.findUnique({
      where: { tokenHash: sid },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date()) return null;
    return session.user;
  } catch {
    return null;
  }
}

// For API routes: throws AuthError, which handlers catch and turn into a 401.
export async function requireUser(): Promise<User> {
  const u = await getCurrentUser();
  if (!u) throw new AuthError("UNAUTHENTICATED");
  return u;
}

// For Server Component PAGES: redirects to /login instead of throwing.
// Pages and layouts render in parallel in the App Router, so a page that
// throws can 500 before the layout's redirect resolves. Using redirect()
// here makes the unauthenticated case a clean 307 every time.
export async function requireUserPage(): Promise<User> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireRole(...allowed: Role[]): Promise<User> {
  const u = await requireUser();
  if (!allowed.includes(u.role)) throw new AuthError("FORBIDDEN");
  return u;
}

export class AuthError extends Error {
  constructor(public code: "UNAUTHENTICATED" | "FORBIDDEN") {
    super(code);
  }
}
