import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { propertyVisibility } from "@/lib/scope";
import { logActivity } from "@/lib/activity";
import type { PortalId } from "@prisma/client";

const schema = z.object({
  portal: z.enum(["ninetynine_acres", "magicbricks", "housing", "olx", "custom_csv", "custom_xml"]),
  enabled: z.boolean(),
});

function serialize(t: {
  portal: PortalId; status: string; lastRefreshedAt: Date | null; nextRefreshAt: Date | null;
  refreshCount: number; refreshIntervalDays: number;
}) {
  return {
    portal: t.portal,
    status: t.status,
    lastRefreshedAt: t.lastRefreshedAt ? t.lastRefreshedAt.toISOString() : null,
    nextRefreshAt: t.nextRefreshAt ? t.nextRefreshAt.toISOString() : null,
    refreshCount: t.refreshCount,
    refreshIntervalDays: t.refreshIntervalDays,
  };
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const property = await prisma.property.findFirst({ where: { id, ...propertyVisibility(user) } });
    if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const { portal, enabled } = parsed.data;

    const nextRefreshAt = enabled ? new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) : null;
    const target = await prisma.listingTarget.upsert({
      where: { propertyId_portal: { propertyId: id, portal } },
      create: { firmId: user.firmId, propertyId: id, portal, status: enabled ? "pending" : "disabled", nextRefreshAt },
      update: { status: enabled ? "pending" : "disabled", nextRefreshAt },
    });

    await logActivity({
      firmId: user.firmId,
      userId: user.id,
      entityType: "property",
      entityId: id,
      action: enabled ? "target_enabled" : "target_disabled",
      payload: { portal },
    });
    return NextResponse.json({ target: serialize(target) });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}
