import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { leadVisibility } from "@/lib/scope";
import { leadCreateSchema } from "@/lib/validators";
import { normalizePhone } from "@/lib/utils";
import { logActivity } from "@/lib/activity";

export async function GET() {
  try {
    const user = await requireUser();
    const leads = await prisma.lead.findMany({
      where: leadVisibility(user),
      include: {
        contact: { select: { id: true, name: true, phone: true } },
        property: { select: { id: true, title: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ leads });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = leadCreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;

    // Resolve or create the contact.
    let contactId = d.contactId;
    if (!contactId) {
      if (!d.contactName || !d.contactPhone) {
        return NextResponse.json({ error: "Provide contactId or contactName + contactPhone" }, { status: 400 });
      }
      const contact = await prisma.contact.create({
        data: {
          firmId: user.firmId,
          name: d.contactName,
          phone: normalizePhone(d.contactPhone),
          email: d.contactEmail || null,
          type: "buyer",
          source: d.source,
          assignedToUserId: user.id,
        },
      });
      contactId = contact.id;
    }

    const lead = await prisma.lead.create({
      data: {
        firmId: user.firmId,
        contactId,
        propertyId: d.propertyId || null,
        source: d.source,
        sourceListingId: d.sourceListingId,
        assignedToUserId: d.assignedToUserId || user.id,
        intent: d.intent,
        budgetMin: d.budgetMin,
        budgetMax: d.budgetMax,
        requirementsText: d.requirementsText,
        nextFollowupAt: d.nextFollowupAt,
      },
    });
    await logActivity({
      firmId: user.firmId,
      userId: user.id,
      entityType: "lead",
      entityId: lead.id,
      action: "create",
    });
    return NextResponse.json({ lead }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}
