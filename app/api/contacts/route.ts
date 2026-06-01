import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { contactVisibility } from "@/lib/scope";
import { contactCreateSchema } from "@/lib/validators";
import { normalizePhone } from "@/lib/utils";
import { logActivity } from "@/lib/activity";

export async function GET() {
  try {
    const user = await requireUser();
    const contacts = await prisma.contact.findMany({
      where: contactVisibility(user),
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ contacts });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = contactCreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;

    const contact = await prisma.contact.create({
      data: {
        firmId: user.firmId,
        name: d.name,
        phone: normalizePhone(d.phone),
        email: d.email || null,
        type: d.type,
        source: d.source,
        assignedToUserId: d.assignedToUserId || user.id,
        tags: d.tags ?? [],
        notes: d.notes,
      },
    });
    await logActivity({
      firmId: user.firmId,
      userId: user.id,
      entityType: "contact",
      entityId: contact.id,
      action: "create",
    });
    return NextResponse.json({ contact }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}
