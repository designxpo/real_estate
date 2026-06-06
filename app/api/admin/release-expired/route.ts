// Cron/sweep: auto-release marketplace bookings whose window has elapsed, so the
// listing returns to the open pool. Idempotent. Protect with CRON_SECRET if set.
import { NextResponse } from "next/server";
import { releaseExpiredBookings } from "@/lib/booking";
import { checkCronAuth } from "@/lib/cron-auth";

export async function POST(req: Request) {
  const denied = checkCronAuth(req);
  if (denied) return denied;
  const released = await releaseExpiredBookings();
  return NextResponse.json({ ok: true, released });
}
