// Create a work order (maintenance ticket).
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";

const schema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  unitId: z.string().optional().or(z.literal("")),
  category: z.enum(["plumbing", "electrical", "hvac", "carpentry", "cleaning", "other"]).optional(),
  priority: z.enum(["urgent", "high", "normal"]).optional(),
  assignee: z.string().max(120).optional(),
  slaDays: z.coerce.number().int().min(0).max(60).optional(),
  raisedByTenant: z.coerce.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (user.role === "sub_broker") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;

    if (d.unitId) {
      const unit = await prisma.pmUnit.findFirst({ where: { id: d.unitId, firmId: user.firmId }, select: { id: true } });
      if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }
    const slaDueAt = d.slaDays != null ? new Date(Date.now() + d.slaDays * 86_400_000) : null;
    const wo = await prisma.pmWorkOrder.create({
      data: {
        firmId: user.firmId,
        title: d.title,
        description: d.description || null,
        unitId: d.unitId || null,
        category: d.category ?? "other",
        priority: d.priority ?? "normal",
        assignee: d.assignee || null,
        slaDueAt,
        raisedByTenant: d.raisedByTenant ?? false,
      },
    });
    return NextResponse.json({ ok: true, id: wo.id }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}
