// Brokerage invoice helpers: GST split, atomic per-firm-per-FY numbering,
// and INR amount-in-words. HSN/SAC for real-estate agent services is 9972.
import type { Prisma } from "@prisma/client";

export const HSN_SAC = "9972";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface GstInput {
  base: number;
  gstPct: number;
  sameState: boolean; // supplier state === place of supply
}

export interface GstResult {
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

// Same state → CGST + SGST (half each). Cross state (or unknown) → IGST.
export function computeGst({ base, gstPct, sameState }: GstInput): GstResult {
  if (sameState) {
    const half = round2((base * gstPct) / 200);
    return { cgst: half, sgst: half, igst: 0, total: round2(base + half * 2) };
  }
  const igst = round2((base * gstPct) / 100);
  return { cgst: 0, sgst: 0, igst, total: round2(base + igst) };
}

// Atomically reserve the next sequence for (firm, FY) and format the number,
// e.g. "SR/2627/0001". Must be called inside a transaction.
export async function nextInvoiceNumber(
  tx: Prisma.TransactionClient,
  firmId: string,
  fy: string,
  prefix: string,
): Promise<{ invoiceNumber: string; seq: number }> {
  const counter = await tx.invoiceCounter.upsert({
    where: { firmId_fy: { firmId, fy } },
    create: { firmId, fy, lastSeq: 1 },
    update: { lastSeq: { increment: 1 } },
  });
  const seq = counter.lastSeq;
  const invoiceNumber = `${prefix}/${fy}/${String(seq).padStart(4, "0")}`;
  return { invoiceNumber, seq };
}

// --- INR amount in words -----------------------------------------------------
const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES[n % 10] : ""}`;
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return `${h ? ONES[h] + " Hundred" + (rest ? " " : "") : ""}${rest ? twoDigits(rest) : ""}`;
}

// Indian system: crore, lakh, thousand, hundred.
function intToWords(n: number): string {
  if (n === 0) return "Zero";
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  const parts: string[] = [];
  if (crore) parts.push(`${intToWords(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (rest) parts.push(threeDigits(rest));
  return parts.join(" ").trim();
}

export function amountInWords(amount: number): string {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let words = `${intToWords(rupees)} Rupees`;
  if (paise > 0) words += ` and ${twoDigits(paise)} Paise`;
  return `${words} Only`;
}
