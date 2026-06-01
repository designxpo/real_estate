import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireUser } from "@/lib/auth";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const view = new URL(req.url).searchParams.get("view");
    const splits = await prisma.commissionSplit.findMany({
      where: { deal: { firmId: user.firmId } },
      include: { user: { select: { name: true } }, deal: { select: { property: { select: { title: true } } } } },
      orderBy: { createdAt: "desc" },
    });

    if (view === "tds") {
      // TDS register: only rows where TDS was deducted.
      const tdsRows = splits.filter((s) => Number(s.tdsAmount) > 0);
      const csv = toCsv(tdsRows, [
        { header: "Recipient", value: (s) => s.user?.name ?? s.externalName ?? "" },
        { header: "Deal", value: (s) => s.deal.property.title },
        { header: "Gross", value: (s) => Number(s.amount) },
        { header: "TDS %", value: (s) => Number(s.tdsPct) },
        { header: "TDS Amount", value: (s) => Number(s.tdsAmount) },
        { header: "Status", value: (s) => s.status },
        { header: "Paid At", value: (s) => s.paidAt ?? "" },
      ]);
      return csvResponse("tds-register.csv", csv);
    }

    const csv = toCsv(splits, [
      { header: "Recipient", value: (s) => s.user?.name ?? s.externalName ?? "" },
      { header: "Deal", value: (s) => s.deal.property.title },
      { header: "Role", value: (s) => s.role },
      { header: "Gross", value: (s) => Number(s.amount) },
      { header: "TDS", value: (s) => Number(s.tdsAmount) },
      { header: "Net", value: (s) => Number(s.netAmount) },
      { header: "Status", value: (s) => s.status },
    ]);
    return csvResponse("commissions.csv", csv);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
}
