"use client";

export function InvoicePrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden text-sm px-3 py-1.5 rounded-inner bg-accent text-white"
    >
      Print / Save PDF
    </button>
  );
}
