// GET /api/magic-link/:token
//
// Landlord clicks the link from their SMS/email. We verify + consume the token,
// establish a session for the landlord User, and redirect to their property
// switch at /landlord. Invalid/expired/used tokens redirect to a friendly error.

import { NextResponse } from "next/server";
import { consumeMagicLink } from "@/lib/magic-link";
import { createSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = new URL(req.url);
  const base = `${url.protocol}//${url.host}`;

  const result = await consumeMagicLink(token);
  if (!result.ok) {
    return NextResponse.redirect(`${base}/landlord/error?reason=${result.reason}`);
  }

  // Establish a session for the landlord User (sets the httpOnly cookie).
  await createSession(result.userId);

  return NextResponse.redirect(`${base}/landlord`);
}
