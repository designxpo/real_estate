// Indian financial year helpers. FY runs 1 Apr → 31 Mar.
// `financialYearCode` yields the compact form used in invoice numbers, e.g. a
// date in FY 2026-27 → "2627".

export function financialYearStart(date: Date): number {
  const y = date.getFullYear();
  // Jan–Mar belong to the FY that started the previous calendar year.
  return date.getMonth() >= 3 ? y : y - 1;
}

// "2627" for FY 2026-27.
export function financialYearCode(date: Date = new Date()): string {
  const start = financialYearStart(date);
  const end = (start + 1) % 100;
  return `${String(start).slice(-2)}${String(end).padStart(2, "0")}`;
}

// "2026-27" — human label.
export function financialYearLabel(date: Date = new Date()): string {
  const start = financialYearStart(date);
  const end = (start + 1) % 100;
  return `${start}-${String(end).padStart(2, "0")}`;
}
