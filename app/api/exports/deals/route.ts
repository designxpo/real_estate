import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { dealVisibility } from "@/lib/scope";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  try {
    const user = await requireUser();
    const deals = await prisma.deal.findMany({
      where: dealVisibility(user),
      include: { property: { select: { title: true } }, buyer: { select: { name: true } }, primaryBroker: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    const csv = toCsv(deals, [
      { header: "Property", value: (d) => d.property.title },
      { header: "Buyer", value: (d) => d.buyer.name },
      { header: "Type", value: (d) => d.dealType },
      { header: "Stage", value: (d) => d.stage },
      { header: "Agreed Price", value: (d) => Number(d.agreedPrice) },
      { header: "Total Brokerage", value: (d) => Number(d.totalBrokerage) },
      { header: "Broker", value: (d) => d.primaryBroker.name },
      { header: "Registration Date", value: (d) => d.registrationDate ?? "" },
    ]);
    return csvResponse("deals.csv", csv);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}
