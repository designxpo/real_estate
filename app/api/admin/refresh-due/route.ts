// Cron-triggered: refresh all feed-mode listing targets whose nextRefreshAt has
// passed. Gated by the ADMIN_CRON_SECRET header. Wire to Vercel Cron / cron-job.org.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function authorized(req: Request): boolean {
  const secret = process.env.ADMIN_CRON_SECRET;
  return Boolean(secret && req.headers.get("x-admin-secret") === secret);
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const due = await prisma.listingTarget.findMany({
    where: { status: { in: ["pending", "posted", "refreshed"] }, nextRefreshAt: { lte: now } },
    take: 200,
  });

  let refreshed = 0;
  for (const t of due) {
    // ±18h jitter avoids bot-like fixed-interval patterns.
    const jitterMs = (Math.floor((t.refreshCount * 7919) % 36) - 18) * 60 * 60 * 1000;
    const next = new Date(now.getTime() + t.refreshIntervalDays * 24 * 60 * 60 * 1000 + jitterMs);
    await prisma.listingTarget.update({
      where: { id: t.id },
      data: { status: "refreshed", lastRefreshedAt: now, nextRefreshAt: next, refreshCount: { increment: 1 } },
    });
    refreshed++;
  }
  return NextResponse.json({ ok: true, refreshed });
}
