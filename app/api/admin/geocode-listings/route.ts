// Backfill: geocode live marketplace listings that are missing coordinates.
// Throttled to ~1 req/sec to respect Nominatim's usage policy. Protect with
// CRON_SECRET if set. Idempotent — only fills blanks.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { geocode } from "@/lib/geocode";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await prisma.marketplaceListing.findMany({
    where: { moderation: "live", OR: [{ lat: null }, { lng: null }] },
    select: { id: true, addressLine: true, locality: true, city: true, state: true, pincode: true },
    take: 50, // bounded per run
  });

  let filled = 0;
  for (const l of due) {
    const geo = await geocode(l);
    if (geo) {
      await prisma.marketplaceListing.update({ where: { id: l.id }, data: { lat: geo.lat, lng: geo.lng } });
      filled++;
    }
    await sleep(1100); // Nominatim: max ~1 request/second
  }
  return NextResponse.json({ ok: true, scanned: due.length, filled });
}
