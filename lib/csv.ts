// Minimal RFC 4180 CSV writer. Quotes fields containing comma/quote/newline,
// escapes embedded quotes by doubling, renders Dates as ISO, null/undefined as
// empty. Used by the /api/exports/* endpoints.

export type CsvCell = string | number | boolean | Date | null | undefined;

function escapeCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  let s: string;
  if (value instanceof Date) s = value.toISOString();
  else s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => CsvCell;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const head = columns.map((c) => escapeCell(c.header)).join(",");
  const body = rows.map((r) => columns.map((c) => escapeCell(c.value(r))).join(","));
  return [head, ...body].join("\r\n");
}

// Wrap CSV text in a downloadable Response.
export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
