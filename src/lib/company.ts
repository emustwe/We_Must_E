// The company behind Muste, shown in the privacy policy, the terms, the legal
// pages' footer and the email footer. PLACEHOLDERS: fill in the real details
// here only; anything left null is simply not shown.
export const COMPANY = {
  // Exactly as registered, e.g. "Example Technologies (Private) Limited".
  legalName: null as string | null,
  // "secp": a company registered with SECP; "fbr": registered only with FBR
  // (sole proprietorship or partnership).
  registration: "fbr" as "secp" | "fbr",
  // FBR National Tax Number.
  ntn: null as string | null,
  // SECP registration number (CUIN), only for an SECP company.
  secpCuin: null as string | null,
  // Registered business address, one line.
  address: null as string | null,
  // Business phone number to show (optional), e.g. "+92 300 1234567".
  phone: null as string | null,
  country: "Pakistan",
};

// "Muste is run by Example (Private) Limited, a company registered in
// Pakistan (SECP no. 0123456, NTN 1234567-8), Street, City." Only the
// details that are filled in.
export function companyLine(): string | null {
  const c = COMPANY;
  if (!c.legalName) return null;
  const numbers = [
    c.registration === "secp" && c.secpCuin ? `SECP registration no. ${c.secpCuin}` : null,
    c.ntn ? `NTN ${c.ntn}` : null,
  ].filter(Boolean);
  const kind =
    c.registration === "secp"
      ? `a company registered in ${c.country}`
      : `a business registered with the Federal Board of Revenue in ${c.country}`;
  return [
    `Muste is run by ${c.legalName}, ${kind}${numbers.length ? ` (${numbers.join(", ")})` : ""}.`,
    c.address ? `Address: ${c.address}.` : null,
    c.phone ? `Phone: ${c.phone}.` : null,
  ]
    .filter(Boolean)
    .join(" ");
}
