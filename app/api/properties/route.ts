import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { propertyVisibility } from "@/lib/scope";
import { propertyCreateSchema } from "@/lib/validators";
import { makePropertySlug } from "@/lib/slug";
import { logActivity } from "@/lib/activity";

export async function GET() {
  try {
    const user = await requireUser();
    const properties = await prisma.property.findMany({
      where: propertyVisibility(user),
      include: { photos: { orderBy: { position: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ properties });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = propertyCreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;

    const property = await prisma.property.create({
      data: {
        firmId: user.firmId,
        listedByUserId: user.id,
        ownerContactId: d.ownerContactId || null,
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
        pincode: d.pincode || null,
        amenities: d.amenities ?? [],
        furnishing: d.furnishing,
        facing: d.facing,
        ageYears: d.ageYears,
        floor: d.floor,
        totalFloors: d.totalFloors,
        availableFrom: d.availableFrom,
        status: d.status,
        reraId: d.reraId,
        publicSlug: makePropertySlug(d.title),
        photos: d.photos
          ? { create: d.photos.map((p, i) => ({ url: p.url, caption: p.caption, position: i })) }
          : undefined,
      },
    });
    await logActivity({
      firmId: user.firmId,
      userId: user.id,
      entityType: "property",
      entityId: property.id,
      action: "create",
    });
    return NextResponse.json({ property }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}
