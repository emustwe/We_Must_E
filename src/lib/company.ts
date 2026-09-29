// The company behind WemustE, shown in the privacy policy, the terms, the legal
// pages' footer and the email footer. Change the details here only; anything
// left null (the phone) is simply not shown.
export const COMPANY = {
  // Exactly as registered, e.g. "Example Technologies (Private) Limited".
  legalName: "UnifiedSoftwareSolutions (Private) Limited" as string | null,
  // "secp": a company registered with SECP; "fbr": registered only with FBR
  // (sole proprietorship or partnership).
  registration: "secp" as "secp" | "fbr",
  // FBR registration number (NTN).
  ntn: "I603015" as string | null,
  // SECP registration number (CUIN), only for an SECP company.
  secpCuin: "0328510" as string | null,
  // Registered business address, one line.
  address:
    "Street 2, House No. 32, Hussain Town, Yousafabad, Ring Road, Peshawar, Khyber Pakhtunkhwa, Pakistan" as
      string | null,
  // Business phone number to show (optional), e.g. "+92 300 1234567".
  phone: null as string | null,
  country: "Pakistan",
};

// "WemustE is run by Example (Private) Limited, a company registered in
// Pakistan (SECP registration no. 0123456, FBR registration no. A123456).
// Address: Street, City." Only the details that are filled in.
export function companyLine(): string | null {
  const c = COMPANY;
  if (!c.legalName) return null;
  const numbers = [
    c.registration === "secp" && c.secpCuin ? `SECP registration no. ${c.secpCuin}` : null,
    c.ntn ? `FBR registration no. ${c.ntn}` : null,
  ].filter(Boolean);
  const kind =
    c.registration === "secp"
      ? `a company registered in ${c.country}`
      : `a business registered with the Federal Board of Revenue in ${c.country}`;
  return [
    `WemustE is run by ${c.legalName}, ${kind}${numbers.length ? ` (${numbers.join(", ")})` : ""}.`,
    c.address ? `Address: ${c.address}.` : null,
    c.phone ? `Phone: ${c.phone}.` : null,
  ]
    .filter(Boolean)
    .join(" ");
}
