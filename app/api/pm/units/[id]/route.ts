// Update a unit's status (e.g. mark on-notice or vacant when a lease ends).
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";

const schema = z.object({ status: z.enum(["vacant", "occupied", "notice"]) });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (user.role === "sub_broker") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    const { id } = await ctx.params;
    const unit = await prisma.pmUnit.findFirst({ where: { id, firmId: user.firmId }, select: { id: true } });
    if (!unit) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    // Ending occupancy → close any active leases on the unit.
    if (parsed.data.status === "vacant") {
      await prisma.pmLease.updateMany({ where: { unitId: id, status: "active" }, data: { status: "ended", endDate: new Date() } });
    }
    await prisma.pmUnit.update({ where: { id }, data: { status: parsed.data.status } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}
