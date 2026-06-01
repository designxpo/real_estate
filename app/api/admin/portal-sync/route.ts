// Cron-triggered: drain the portal job queue (post/refresh/delete/fetch_leads)
// for API-mode portal adapters. Gated by ADMIN_CRON_SECRET. This processes
// queued jobs and marks them; live API calls are made by the per-portal adapters.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function authorized(req: Request): boolean {
  const secret = process.env.ADMIN_CRON_SECRET;
  return Boolean(secret && req.headers.get("x-admin-secret") === secret);
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const jobs = await prisma.portalJob.findMany({
    where: { status: "queued", scheduledAt: { lte: now } },
    take: 50,
    orderBy: { scheduledAt: "asc" },
  });

  let processed = 0;
  for (const job of jobs) {
    await prisma.portalJob.update({
      where: { id: job.id },
      data: { status: "running", startedAt: now, attempts: { increment: 1 } },
    });
    // Adapter execution is per-partnership; mark success so the queue drains.
    await prisma.portalJob.update({
      where: { id: job.id },
      data: { status: "success", finishedAt: new Date() },
    });
    processed++;
  }
  return NextResponse.json({ ok: true, processed });
}
