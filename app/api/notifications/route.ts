// GET  /api/notifications        → recent notifications for the current user + unread count
// PATCH /api/notifications        → mark one ({id}) or all ({all:true}) as read
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();
    const [notifications, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    ]);
    return NextResponse.json({ notifications, unread });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}

const patchSchema = z.object({ id: z.string().optional(), all: z.boolean().optional() });

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const now = new Date();
    if (parsed.data.all) {
      await prisma.notification.updateMany({
        where: { userId: user.id, readAt: null },
        data: { readAt: now },
      });
    } else if (parsed.data.id) {
      await prisma.notification.updateMany({
        where: { id: parsed.data.id, userId: user.id },
        data: { readAt: now },
      });
    }
    const unread = await prisma.notification.count({ where: { userId: user.id, readAt: null } });
    return NextResponse.json({ ok: true, unread });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}
