// Platform-owner plan catalog management. GET = all plans (incl. inactive);
// POST = create a new plan tier.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/auth";
import { requirePlatformAdmin } from "@/lib/platform-auth";
import { getPlans } from "@/lib/plans";

const createSchema = z.object({
  id: z.string().trim().min(1).max(40).regex(/^[a-z0-9_-]+$/, "Use lowercase letters, numbers, - or _"),
  name: z.string().trim().min(1).max(60),
  tagline: z.string().trim().max(120).optional().default(""),
  priceMonthly: z.number().int().min(0).max(10_000_000),
  maxActiveBookings: z.number().int().min(0).max(100_000),
  features: z.array(z.string().trim().max(80)).max(20).optional().default([]),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  try {
    await requirePlatformAdmin();
    const plans = await getPlans(true); // include inactive
    return NextResponse.json({ plans });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requirePlatformAdmin();
    const parsed = createSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid plan", details: parsed.error.flatten() }, { status: 400 });
    }
    const d = parsed.data;
    const exists = await prisma.plan.findUnique({ where: { id: d.id } });
    if (exists) return NextResponse.json({ error: "A plan with that id already exists" }, { status: 409 });

    const maxOrder = await prisma.plan.aggregate({ _max: { sortOrder: true } });
    const plan = await prisma.plan.create({
      data: {
        id: d.id,
        name: d.name,
        tagline: d.tagline ?? "",
        priceMonthly: d.priceMonthly,
        maxActiveBookings: d.maxActiveBookings,
        features: d.features ?? [],
        sortOrder: d.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
      },
    });
    return NextResponse.json({ plan }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
