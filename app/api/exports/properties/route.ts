import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { propertyVisibility } from "@/lib/scope";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  try {
    const user = await requireUser();
    const properties = await prisma.property.findMany({
      where: propertyVisibility(user),
      orderBy: { createdAt: "desc" },
    });
    const csv = toCsv(properties, [
      { header: "Title", value: (p) => p.title },
      { header: "Listing", value: (p) => p.listingType },
      { header: "Type", value: (p) => p.propertyType },
      { header: "BHK", value: (p) => p.bhk ?? "" },
      { header: "Price", value: (p) => Number(p.priceAmount) },
      { header: "Unit", value: (p) => p.priceUnit },
      { header: "Locality", value: (p) => p.locality ?? "" },
      { header: "City", value: (p) => p.city },
      { header: "Status", value: (p) => p.status },
    ]);
    return csvResponse("properties.csv", csv);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}
