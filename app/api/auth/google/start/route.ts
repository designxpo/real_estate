// Begin Google sign-in: set a CSRF state cookie and redirect to Google consent.
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { isGoogleConfigured, buildGoogleAuthUrl } from "@/lib/google-oauth";

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(`${origin}/login?error=google_unconfigured`);
  }
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(buildGoogleAuthUrl(origin, state));
  res.cookies.set("g_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
