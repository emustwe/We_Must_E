// Reads contacts pasted from a spreadsheet or a CSV file: one per line, as
// "Name, Company, Email, Country" (country optional; commas, semicolons or
// tabs). A header row, if any, may put the columns in any order.

export type OutreachContactInput = {
  name: string;
  company: string;
  email: string;
  country?: string;
};

export type ParsedContacts = {
  contacts: OutreachContactInput[];
  // Lines that couldn't be read (1-based line numbers).
  badLines: number[];
};

export const OUTREACH_MAX_BATCH = 500;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function splitRow(line: string): string[] {
  const sep = line.includes("\t") ? "\t" : line.includes(";") && !line.includes(",") ? ";" : ",";
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && !cell.trim()) {
      quoted = true;
      cell = "";
    } else if (ch === sep) {
      cells.push(cell.trim());
      cell = "";
    } else cell += ch;
  }
  cells.push(cell.trim());
  return cells;
}

type Columns = { name: number; company: number; email: number; country: number };
const DEFAULT_COLUMNS: Columns = { name: 0, company: 1, email: 2, country: 3 };

function headerColumns(cells: string[]): Columns | null {
  if (cells.some((c) => c.includes("@")) || !cells.some((c) => /e-?mail/i.test(c))) return null;
  const find = (test: (c: string) => boolean) => cells.findIndex((c) => test(c.toLowerCase()));
  const company = find((c) => /company|business|organi[sz]ation|employer/.test(c));
  return {
    company,
    email: find((c) => /e-?mail/.test(c)),
    country: find((c) => /country/.test(c)),
    name: cells.findIndex(
      (c, i) => i !== company && /name|contact|person/.test(c.toLowerCase()),
    ),
  };
}

export function parseContacts(text: string): ParsedContacts {
  const contacts: OutreachContactInput[] = [];
  const badLines: number[] = [];
  const seen = new Set<string>();
  let columns = DEFAULT_COLUMNS;
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    const cells = splitRow(line);
    if (!contacts.length && !badLines.length) {
      const header = headerColumns(cells);
      if (header) {
        columns = header;
        return;
      }
    }
    const at = (n: number) => (n >= 0 ? (cells[n] ?? "").trim() : "");
    const email = at(columns.email).toLowerCase();
    const contact = {
      name: at(columns.name),
      company: at(columns.company),
      email,
      country: at(columns.country) || undefined,
    };
    if (
      !EMAIL.test(email) ||
      email.length > 254 ||
      !contact.name ||
      contact.name.length > 120 ||
      !contact.company ||
      contact.company.length > 160 ||
      (contact.country?.length ?? 0) > 60
    ) {
      badLines.push(i + 1);
      return;
    }
    if (seen.has(email)) return;
    seen.add(email);
    contacts.push(contact);
  });
  return { contacts, badLines };
}

// "Sara Khan" -> "Sara" (for "Hi Sara,").
export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;
