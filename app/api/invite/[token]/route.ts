// GET /api/invite/:token — teammate accepts an invite. Consumes the one-time
// token, signs them in, and sends them to set a password.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { consumeMagicLink } from "@/lib/magic-link";
import { createSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = new URL(req.url);
  const base = `${url.protocol}//${url.host}`;

  const result = await consumeMagicLink(token);
  if (!result.ok) {
    return NextResponse.redirect(`${base}/login?invite=${result.reason}`);
  }
  if (result.purpose !== "team_invite") {
    return NextResponse.redirect(`${base}/login?invite=not_found`);
  }

  await createSession(result.userId);
  // First action: set a password. New=1 tells the page this is an invite accept.
  return NextResponse.redirect(`${base}/set-password?new=1`);
}
