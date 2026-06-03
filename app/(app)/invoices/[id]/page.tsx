import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth";
import { amountInWords } from "@/lib/invoice";
import { InvoicePrintButton } from "@/components/invoice-print-button";

export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUserPage();
  const inv = await prisma.invoice.findFirst({
    where: { id, firmId: user.firmId },
    include: { firm: true, contact: true, deal: { include: { property: { select: { title: true } }, marketplaceListing: { select: { title: true } } } } },
  });
  if (!inv) notFound();

  const isIntra = Number(inv.cgstAmount) > 0;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-end mb-3"><InvoicePrintButton /></div>
      <div className="bg-white text-black rounded-lg border border-gray-300 p-8 print:border-0 print:p-0">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-xl font-bold">{inv.firm.name}</h1>
            {inv.firm.address && <div className="text-sm">{inv.firm.address}</div>}
            <div className="text-sm">{[inv.firm.city, inv.firm.state, inv.firm.pincode].filter(Boolean).join(", ")}</div>
            {inv.firm.gstNumber && <div className="text-sm">GSTIN: {inv.firm.gstNumber}</div>}
            {inv.firm.reraNumber && <div className="text-sm">RERA: {inv.firm.reraNumber}</div>}
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">TAX INVOICE</div>
            <div className="text-sm">{inv.invoiceNumber}</div>
            <div className="text-sm">{inv.invoiceDate.toLocaleDateString("en-IN")}</div>
          </div>
        </div>

        <div className="mb-4 text-sm">
          <div className="font-semibold">Billed to:</div>
          <div>{inv.contact.name}</div>
          {inv.contact.phone && <div>{inv.contact.phone}</div>}
          {inv.billedToState && <div>State: {inv.billedToState}</div>}
        </div>

        <table className="w-full text-sm border-collapse mb-4">
          <thead>
            <tr className="border-y border-gray-400">
              <th className="text-left py-2">Description</th>
              <th className="text-center py-2">HSN/SAC</th>
              <th className="text-right py-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="py-2">Brokerage — {inv.deal.property?.title ?? inv.deal.marketplaceListing?.title ?? "Marketplace deal"}</td>
              <td className="text-center">{inv.hsnSac}</td>
              <td className="text-right">₹{Number(inv.brokerageBase).toLocaleString("en-IN")}</td>
            </tr>
          </tbody>
        </table>

        <div className="ml-auto w-64 text-sm space-y-1">
          <Row label="Taxable value" value={Number(inv.brokerageBase)} />
          {isIntra ? (
            <>
              <Row label={`CGST (${Number(inv.gstPct) / 2}%)`} value={Number(inv.cgstAmount)} />
              <Row label={`SGST (${Number(inv.gstPct) / 2}%)`} value={Number(inv.sgstAmount)} />
            </>
          ) : (
            <Row label={`IGST (${Number(inv.gstPct)}%)`} value={Number(inv.igstAmount)} />
          )}
          <div className="border-t border-gray-400 pt-1 font-bold">
            <Row label="Total" value={Number(inv.totalAmount)} />
          </div>
        </div>

        <div className="mt-4 text-sm italic">
          Amount in words: {amountInWords(Number(inv.totalAmount))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>₹{value.toLocaleString("en-IN")}</span>
    </div>
  );
}
