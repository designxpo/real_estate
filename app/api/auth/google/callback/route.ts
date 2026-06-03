// Google sign-in callback: verify state, exchange the code, then find-or-create
// the user. New Google users get a firm (owner role) — they complete KYC later.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { createSession, homePathForRole } from "@/lib/auth";
import { isGoogleConfigured, exchangeGoogleCode } from "@/lib/google-oauth";
import { logActivity } from "@/lib/activity";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  if (!isGoogleConfigured()) return NextResponse.redirect(`${origin}/login?error=google_unconfigured`);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expected = cookieStore.get("g_oauth_state")?.value;
  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(`${origin}/login?error=google_state`);
  }

  let profile;
  try {
    profile = await exchangeGoogleCode(code, origin);
  } catch {
    return NextResponse.redirect(`${origin}/login?error=google_failed`);
  }

  // Match by googleId first, then by email (link an existing account).
  let user =
    (await prisma.user.findUnique({ where: { googleId: profile.sub } })) ??
    (await prisma.user.findUnique({ where: { email: profile.email } }));

  if (user) {
    // Link Google + backfill photo on first Google login.
    if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.sub, photoUrl: user.photoUrl ?? profile.picture ?? null },
      });
    }
  } else {
    const name = profile.name || profile.email.split("@")[0];
    user = await prisma.$transaction(async (tx) => {
      const firm = await tx.firm.create({ data: { name: `${name}'s Firm`, verificationStatus: "pending" } });
      const owner = await tx.user.create({
        data: {
          firmId: firm.id,
          name,
          // Google users may not have a phone yet — use a unique placeholder they update later.
          phone: `google:${profile.sub}`,
          email: profile.email,
          role: "owner",
          googleId: profile.sub,
          photoUrl: profile.picture ?? null,
        },
      });
      await tx.firm.update({ where: { id: firm.id }, data: { ownerUserId: owner.id } });
      return owner;
    });
    await logActivity({ firmId: user.firmId, userId: user.id, entityType: "user", entityId: user.id, action: "signup_google" });
  }

  await createSession(user.id);
  const res = NextResponse.redirect(`${origin}${homePathForRole(user.role)}`);
  res.cookies.delete("g_oauth_state");
  return res;
}
