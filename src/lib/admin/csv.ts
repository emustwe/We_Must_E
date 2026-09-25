// CSV for the admin exports. Cells that a spreadsheet would run as a formula
// (=, +, -, @, tab, CR) are prefixed with ' so an export can never execute.
export function csvCell(value: unknown) {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: unknown[][]) {
  // BOM so Excel opens UTF-8 names correctly.
  return `﻿${[header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

export function csvResponse(body: string, name: string) {
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "no-store",
    },
  });
}
