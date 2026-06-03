// Cron/sweep: auto-release marketplace bookings whose window has elapsed, so the
// listing returns to the open pool. Idempotent. Protect with CRON_SECRET if set.
import { NextResponse } from "next/server";
import { releaseExpiredBookings } from "@/lib/booking";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const released = await releaseExpiredBookings();
  return NextResponse.json({ ok: true, released });
}
