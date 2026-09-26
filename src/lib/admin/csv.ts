// CSV for the admin exports. Cells that a spreadsheet would run as a formula
// (=, +, -, @, |, %, tab, CR, also after leading spaces) are prefixed with ' so
// an export can never execute.
export function csvCell(value: unknown) {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[\t\r|%]/.test(s) || /^\s*[=+\-@]/.test(s)) s = `'${s}`;
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

// Exports start only from our own pages: a link or redirect from another site
// (which the browser marks as cross-site) can't start a download or write an
// export entry in the audit log.
export function fromOtherSite(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  return site !== null && site !== "same-origin" && site !== "none";
}
