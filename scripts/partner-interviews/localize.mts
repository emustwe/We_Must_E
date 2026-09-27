// A UAE role's questions for a job in another country: prices in the local
// currency (converted and rounded, so the numbers stay realistic), the local
// ID card, and local addresses and phone numbers. Roles written for Pakistan,
// India and Bangladesh don't need it (they name no country).
import type { Role } from "./types.mjs";

export type Country = "AE" | "PK" | "IN" | "BD";

const LOCAL: Record<
  Exclude<Country, "AE">,
  {
    currency: string;
    perAed: number;
    idCard: string;
    sweets: string;
    address: string;
    phones: [string, string];
    mobile: string;
    office: [string, string];
  }
> = {
  PK: {
    currency: "PKR",
    perAed: 76,
    idCard: "CNIC",
    sweets: "traditional sweets (mithai)",
    address: "House 12, Street 8, DHA Phase 2, Lahore",
    phones: ["0300 482 1937", "0300 482 1397"],
    mobile: "0300 123 4567",
    office: ["+92 42 123 4567", "+92421234576"],
  },
  IN: {
    currency: "INR",
    perAed: 23,
    idCard: "ID card",
    sweets: "Indian sweets (mithai)",
    address: "Flat 12, Building 8, Andheri East, Mumbai",
    phones: ["98482 21937", "98482 21397"],
    mobile: "98765 43210",
    office: ["+91 22 1234 5678", "+912212345687"],
  },
  BD: {
    currency: "BDT",
    perAed: 33,
    idCard: "NID card",
    sweets: "Bengali sweets (mishti)",
    address: "House 12, Road 8, Dhanmondi, Dhaka",
    phones: ["01712 821937", "01712 821397"],
    mobile: "01712 345678",
    office: ["+880 2 1234 5678", "+880212345687"],
  },
};

// 32.50 AED -> "PKR 2,470": rounded to 10 (under 1,000) or 50.
function money(aed: string, c: (typeof LOCAL)["PK"]) {
  const value = Number(aed.replace(/,/g, "")) * c.perAed;
  const step = value < 1000 ? 10 : 50;
  const rounded = Math.max(step, Math.round(value / step) * step);
  return `${c.currency} ${rounded.toLocaleString("en-US")}`;
}

function text(s: string, c: (typeof LOCAL)["PK"]) {
  const n = String.raw`(\d[\d,]*(?:\.\d+)?)`;
  return s
    .replace(new RegExp(`AED ${n}`, "g"), (_, v: string) => money(v, c))
    .replace(new RegExp(`${n} (?:AED|dirhams?)`, "g"), (_, v: string) => money(v, c))
    .replace(/Emirates ID/g, c.idCard)
    .replace(/Arabic sweets/g, c.sweets)
    .replace(/Villa 12, Street 8, Al Barsha 2, Dubai/g, c.address)
    .replace(/055 482 1937/g, c.phones[0])
    .replace(/055 482 1397/g, c.phones[1])
    .replace(/050 123 4567/g, c.mobile)
    .replace(/\+971 4 123 4567/g, c.office[0])
    .replace(/\+97141234576/g, c.office[1]);
}

export function localize(role: Role, country: Country): Role {
  if (country === "AE") return role;
  const c = LOCAL[country];
  return Object.fromEntries(
    Object.entries(role).map(([k, v]) => [
      k,
      k === "title" || typeof v !== "string" ? v : text(v, c),
    ]),
  ) as Role;
}
