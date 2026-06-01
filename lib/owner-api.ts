// Shared helpers for /api/v1/owner/* route handlers: JSON responses, a uniform
// auth wrapper, and permissive CORS (so Flutter-web in dev can call the API).
import { NextResponse } from "next/server";
import { requireOwner, OwnerAuthError } from "@/lib/owner-auth";
import type { Owner } from "@prisma/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization,Content-Type",
};

export function ok(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: CORS_HEADERS });
}

export function fail(message: string, status = 400, extra?: unknown): NextResponse {
  return NextResponse.json({ error: message, ...(extra ? { details: extra } : {}) }, {
    status,
    headers: CORS_HEADERS,
  });
}

// CORS preflight — re-export as OPTIONS from any route that needs it.
export function preflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// Wrap a handler that needs an authenticated owner. Catches auth + unexpected
// errors and returns clean JSON.
export async function withOwner(
  req: Request,
  fn: (owner: Owner) => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    const owner = await requireOwner(req);
    return await fn(owner);
  } catch (e) {
    if (e instanceof OwnerAuthError) return fail("Unauthenticated", 401);
    // eslint-disable-next-line no-console
    console.error("[owner-api]", e);
    return fail("Internal error", 500);
  }
}
