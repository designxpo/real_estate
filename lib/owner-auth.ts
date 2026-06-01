// Owner (marketplace) authentication — bearer-token based, for the Flutter app.
//
// Differs from the broker `lib/auth.ts` (cookie sessions) on purpose: mobile
// clients carry tokens, not cookies.
//   - access token  : short-lived stateless JWT (15 min), sent as Bearer header
//   - refresh token  : long-lived opaque random string (60 days), stored HASHED
//                       in OwnerSession so it can be revoked/rotated
//
// Reuses the existing OtpCode table (keyed by phone) for the OTP step.
import { SignJWT, jwtVerify } from "jose";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/db";
import type { Owner } from "@prisma/client";

const ACCESS_TTL = "15m";
const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_DAYS = 60;

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET must be set to a 32+ char string");
  }
  return new TextEncoder().encode(s);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// --- Access token (stateless JWT) -------------------------------------------
async function signAccessToken(ownerId: string): Promise<string> {
  return new SignJWT({ sub: ownerId, typ: "owner_access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .sign(secret());
}

// --- Refresh token (opaque, DB-backed) --------------------------------------
async function issueRefreshToken(ownerId: string, device?: string): Promise<string> {
  const raw = randomBytes(48).toString("hex");
  const refreshHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.ownerSession.create({ data: { ownerId, refreshHash, device, expiresAt } });
  return raw;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds until access token expiry
}

// Mint a fresh access+refresh pair (login / signup).
export async function issueTokens(ownerId: string, device?: string): Promise<TokenPair> {
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(ownerId),
    issueRefreshToken(ownerId, device),
  ]);
  return { accessToken, refreshToken, expiresIn: ACCESS_TTL_SECONDS };
}

// Exchange a valid refresh token for a new access token (rotation-free: the
// refresh token stays valid until expiry/logout). Returns null if invalid.
export async function refreshAccessToken(
  rawRefresh: string,
): Promise<{ accessToken: string; expiresIn: number } | null> {
  const refreshHash = hashToken(rawRefresh);
  const session = await prisma.ownerSession.findUnique({ where: { refreshHash } });
  if (!session || session.expiresAt < new Date()) return null;
  const accessToken = await signAccessToken(session.ownerId);
  return { accessToken, expiresIn: ACCESS_TTL_SECONDS };
}

// Revoke a single refresh token (logout on one device).
export async function revokeRefreshToken(rawRefresh: string): Promise<void> {
  await prisma.ownerSession.deleteMany({ where: { refreshHash: hashToken(rawRefresh) } });
}

// --- Request guard ----------------------------------------------------------
export class OwnerAuthError extends Error {
  constructor(public code: "UNAUTHENTICATED" = "UNAUTHENTICATED") {
    super(code);
  }
}

function bearerFrom(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h || !h.startsWith("Bearer ")) return null;
  return h.slice(7).trim() || null;
}

// Resolve the Owner from the Bearer access token, or null.
export async function getOwnerFromRequest(req: Request): Promise<Owner | null> {
  const token = bearerFrom(req);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.typ !== "owner_access" || typeof payload.sub !== "string") return null;
    return prisma.owner.findUnique({ where: { id: payload.sub } });
  } catch {
    return null;
  }
}

// For API routes: throws OwnerAuthError (handlers turn it into a 401).
export async function requireOwner(req: Request): Promise<Owner> {
  const owner = await getOwnerFromRequest(req);
  if (!owner) throw new OwnerAuthError();
  return owner;
}
