// Shared guard for cron/admin endpoints. Fails CLOSED: if CRON_SECRET is not
// configured the endpoint is disabled (503); if configured, the request must
// carry `Authorization: Bearer <CRON_SECRET>`. Uses a timing-safe comparison.
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// Returns a NextResponse to short-circuit with, or null when authorized.
export function checkCronAuth(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Endpoint disabled: CRON_SECRET not configured" }, { status: 503 });
  }
  const header = req.headers.get("authorization") ?? "";
  if (!safeEqual(header, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
