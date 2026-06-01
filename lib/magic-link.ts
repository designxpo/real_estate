// Magic-link tokens for landlord property activation.
//
// Flow:
//   1. Broker calls request-activation -> we mint a raw token, store only its
//      SHA-256 hash in MagicLink, and return the URL to send to the landlord.
//   2. Landlord opens /api/magic-link/{token} -> we verify+consume the hash,
//      create a session for the landlord User, and redirect to /landlord.
//
// Security properties:
//   - Raw token never stored (only hash) — DB leak can't be replayed.
//   - One-time: consumedAt is set on first use.
//   - Short-lived: expiresAt (default 7 days).
//   - Scoped: each token is bound to exactly one (userId, propertyId).

import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";

const TTL_DAYS = 7;

export function hashMagicToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function createMagicLink(params: {
  firmId: string;
  userId: string;
  propertyId?: string | null; // null for team_invite / password_reset
  purpose?: string;
  ttlDays?: number;
}): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashMagicToken(token);
  const purpose = params.purpose ?? "property_activation";
  const expiresAt = new Date(Date.now() + (params.ttlDays ?? TTL_DAYS) * 24 * 60 * 60 * 1000);

  // Invalidate any prior unconsumed links of the SAME purpose for this user so
  // only the latest link works.
  await prisma.magicLink.updateMany({
    where: { userId: params.userId, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  await prisma.magicLink.create({
    data: {
      firmId: params.firmId,
      userId: params.userId,
      propertyId: params.propertyId ?? null,
      tokenHash,
      purpose,
      expiresAt,
    },
  });
  return { token, expiresAt };
}

export type MagicLinkResult =
  | { ok: true; userId: string; propertyId: string | null; firmId: string; purpose: string }
  | { ok: false; reason: "not_found" | "expired" | "consumed" };

// Validates and (if valid) consumes the token in one atomic-ish step.
export async function consumeMagicLink(rawToken: string): Promise<MagicLinkResult> {
  const tokenHash = hashMagicToken(rawToken);
  const link = await prisma.magicLink.findUnique({ where: { tokenHash } });
  if (!link) return { ok: false, reason: "not_found" };
  if (link.consumedAt) return { ok: false, reason: "consumed" };
  if (link.expiresAt < new Date()) return { ok: false, reason: "expired" };

  await prisma.magicLink.update({
    where: { id: link.id },
    data: { consumedAt: new Date() },
  });
  return {
    ok: true,
    userId: link.userId,
    propertyId: link.propertyId,
    firmId: link.firmId,
    purpose: link.purpose,
  };
}

export function magicLinkUrl(baseUrl: string, token: string): string {
  return `${baseUrl}/api/magic-link/${token}`;
}
