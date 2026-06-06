// Update a work order: advance status, assign, or log cost (feeds maintenance KPI).
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";

const schema = z.object({
  status: z.enum(["new", "assigned", "in_progress", "done", "cancelled"]).optional(),
  assignee: z.string().max(120).optional(),
  costAmount: z.coerce.number().min(0).optional(),
  priority: z.enum(["urgent", "high", "normal"]).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (user.role === "sub_broker") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    const { id } = await ctx.params;
    const existing = await prisma.pmWorkOrder.findFirst({ where: { id, firmId: user.firmId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const d = parsed.data;

    await prisma.pmWorkOrder.update({
      where: { id },
      data: {
        ...(d.status ? { status: d.status } : {}),
        ...(d.assignee !== undefined ? { assignee: d.assignee || null } : {}),
        ...(d.costAmount !== undefined ? { costAmount: d.costAmount } : {}),
        ...(d.priority ? { priority: d.priority } : {}),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
