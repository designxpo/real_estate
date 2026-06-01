"use client";

import { useState } from "react";

// Tap/hover for Indian-specific jargon. On mobile, opens as a bottom sheet.
export function HelpTooltip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          setOpen((x) => !x);
        }}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-fill text-ink-muted hover:text-ink hover:bg-fill-strong text-[10px] font-bold"
        aria-label="Help"
      >
        ?
      </button>
      {open && (
        <span className="absolute left-5 top-0 z-50 w-64 rounded-inner border border-line-strong bg-surface-3 text-xs text-ink px-3 py-2 shadow-card animate-slideUp">
          {children}
        </span>
      )}
    </span>
  );
}

// Pre-built glossaries for the most-asked terms.
export const HELP = {
  rera: (
    <>
      <b>RERA</b> = Real Estate Regulatory Authority. Required by law on listings of new
      registered projects in Karnataka, Maharashtra, UP. Find the ID on the project brochure.
    </>
  ),
  tds: (
    <>
      <b>TDS</b> @ 5% under Sec 194H is deducted by the payer when brokerage exceeds
      ₹15,000/financial year. We auto-suggest 5%; override per split if needed.
    </>
  ),
  gst: (
    <>
      <b>GST</b> on brokerage = 18%. Same-state firm + client → CGST 9% + SGST 9%.
      Cross-state → IGST 18%.
    </>
  ),
  hsn: (
    <>
      <b>HSN/SAC 9972</b> is the standard code for real estate services on a GST invoice.
    </>
  ),
  carpet: (
    <>
      <b>Carpet area</b> = floor area inside the walls of the unit. <b>Built-up</b> adds
      walls + balcony. <b>Super built-up</b> adds the share of common areas. Most buyers
      compare on carpet.
    </>
  ),
  webhook: (
    <>
      A unique URL where Facebook Lead Ads, Google Forms, or your landing page can POST
      a name + phone. We'll auto-create a contact + lead in your firm.
    </>
  ),
} as const;
