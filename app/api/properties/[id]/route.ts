import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { propertyVisibility } from "@/lib/scope";
import { propertyCreateSchema } from "@/lib/validators";
import { logActivity } from "@/lib/activity";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const property = await prisma.property.findFirst({
      where: { id, ...propertyVisibility(user) },
      include: { photos: { orderBy: { position: "asc" } } },
    });
    if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ property });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const existing = await prisma.property.findFirst({ where: { id, ...propertyVisibility(user) } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json().catch(() => null);
    const parsed = propertyCreateSchema.partial().safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;

    const property = await prisma.property.update({
      where: { id },
      data: {
        title: d.title,
        description: d.description,
        listingType: d.listingType,
        propertyType: d.propertyType,
        bhk: d.bhk,
        carpetSqft: d.carpetSqft,
        builtupSqft: d.builtupSqft,
        superSqft: d.superSqft,
        priceAmount: d.priceAmount,
        priceUnit: d.priceUnit,
        negotiable: d.negotiable,
        maintenanceAmount: d.maintenanceAmount,
        depositMonths: d.depositMonths,
        addressLine: d.addressLine,
        locality: d.locality,
        city: d.city,
        state: d.state,
        pincode: d.pincode || undefined,
        amenities: d.amenities,
        furnishing: d.furnishing,
        facing: d.facing,
        ageYears: d.ageYears,
        floor: d.floor,
        totalFloors: d.totalFloors,
        availableFrom: d.availableFrom,
        status: d.status,
        reraId: d.reraId,
      },
    });
    await logActivity({
      firmId: user.firmId,
      userId: user.id,
      entityType: "property",
      entityId: id,
      action: "update",
    });
    return NextResponse.json({ property });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}
