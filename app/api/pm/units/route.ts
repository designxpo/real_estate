// Create a managed unit (Property-Management Ops). Firm-scoped; sub-brokers can't.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";

const schema = z.object({
  label: z.string().min(1).max(120),
  building: z.string().max(160).optional(),
  addressLine: z.string().max(400).optional(),
  city: z.string().max(120).optional(),
  bedrooms: z.coerce.number().int().min(0).max(20).optional(),
  sqft: z.coerce.number().int().min(0).optional(),
  marketRent: z.coerce.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (user.role === "sub_broker") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;
    const unit = await prisma.pmUnit.create({
      data: {
        firmId: user.firmId,
        label: d.label,
        building: d.building || null,
        addressLine: d.addressLine || null,
        city: d.city || null,
        bedrooms: d.bedrooms,
        sqft: d.sqft,
        marketRent: d.marketRent,
        notes: d.notes || null,
      },
    });
    return NextResponse.json({ ok: true, id: unit.id }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
