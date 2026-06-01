// Manual per-portal actions: PATCH = refresh now, DELETE = disable target.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { propertyVisibility } from "@/lib/scope";
import { logActivity } from "@/lib/activity";
import type { PortalId } from "@prisma/client";

async function ownedTarget(user: { id: string; firmId: string; role: string }, id: string, portal: string) {
  const property = await prisma.property.findFirst({ where: { id, ...propertyVisibility(user as never) } });
  if (!property) return null;
  return prisma.listingTarget.findUnique({
    where: { propertyId_portal: { propertyId: id, portal: portal as PortalId } },
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; portal: string }> }) {
  try {
    const user = await requireUser();
    const { id, portal } = await ctx.params;
    const target = await ownedTarget(user, id, portal);
    if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.listingTarget.update({
      where: { id: target.id },
      data: {
        status: "refreshed",
        lastRefreshedAt: new Date(),
        nextRefreshAt: new Date(Date.now() + target.refreshIntervalDays * 24 * 60 * 60 * 1000),
        refreshCount: { increment: 1 },
      },
    });
    await logActivity({
      firmId: user.firmId, userId: user.id, entityType: "property", entityId: id,
      action: "target_manual_refresh", payload: { portal },
    });
    return NextResponse.json({ ok: true, refreshCount: updated.refreshCount });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string; portal: string }> }) {
  try {
    const user = await requireUser();
    const { id, portal } = await ctx.params;
    const target = await ownedTarget(user, id, portal);
    if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.listingTarget.update({ where: { id: target.id }, data: { status: "disabled", nextRefreshAt: null } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}
