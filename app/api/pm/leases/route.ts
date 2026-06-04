// Lease up a unit: create (or reuse) the tenant, create the lease, mark the unit
// occupied — all in one step from the unit's "Add tenant & lease" form.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { normalizePhone } from "@/lib/utils";

const schema = z.object({
  unitId: z.string().min(1),
  tenantName: z.string().min(1).max(120),
  tenantPhone: z.string().min(8).max(20),
  tenantEmail: z.string().email().optional().or(z.literal("")),
  rentAmount: z.coerce.number().positive(),
  depositAmount: z.coerce.number().min(0).optional(),
  rentDueDay: z.coerce.number().int().min(1).max(28).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (user.role === "sub_broker") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;

    const unit = await prisma.pmUnit.findFirst({ where: { id: d.unitId, firmId: user.firmId } });
    if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });

    const phone = normalizePhone(d.tenantPhone);
    await prisma.$transaction(async (tx) => {
      const tenant = await tx.pmTenant.create({
        data: { firmId: user.firmId, name: d.tenantName, phone, email: d.tenantEmail || null },
      });
      await tx.pmLease.create({
        data: {
          firmId: user.firmId,
          unitId: unit.id,
          tenantId: tenant.id,
          rentAmount: d.rentAmount,
          depositAmount: d.depositAmount,
          rentDueDay: d.rentDueDay ?? 5,
          startDate: d.startDate,
          endDate: d.endDate,
          status: "active",
        },
      });
      await tx.pmUnit.update({ where: { id: unit.id }, data: { status: "occupied" } });
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}
