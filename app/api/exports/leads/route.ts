import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { leadVisibility } from "@/lib/scope";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  try {
    const user = await requireUser();
    const leads = await prisma.lead.findMany({
      where: leadVisibility(user),
      include: { contact: { select: { name: true, phone: true } }, property: { select: { title: true } }, assignedTo: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    const csv = toCsv(leads, [
      { header: "Contact", value: (l) => l.contact.name },
      { header: "Phone", value: (l) => l.contact.phone },
      { header: "Stage", value: (l) => l.stage },
      { header: "Intent", value: (l) => l.intent ?? "" },
      { header: "Property", value: (l) => l.property?.title ?? "" },
      { header: "Assigned", value: (l) => l.assignedTo?.name ?? "" },
      { header: "Source", value: (l) => l.source },
      { header: "Created", value: (l) => l.createdAt },
    ]);
    return csvResponse("leads.csv", csv);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}
