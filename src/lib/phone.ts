// Phone numbers are stored in E.164 (+971501234567). Local mobile formats of
// the countries with jobs are accepted too; they don't overlap, so no country
// choice is needed:
//   UAE         050 123 4567, 50 123 4567, 04 123 4567 (landline)
//   Pakistan    0300 1234567
//   India       98765 43210, 098765 43210
//   Bangladesh  01712 345678
// Anything else needs the country code (+44 ..., 0044 ...).
export function toE164(input: string): string | null {
  let digits = input.trim().replace(/[\s().-]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  if (!digits.startsWith("+")) {
    if (!/^\d+$/.test(digits)) return null;
    if (/^0?5\d{8}$/.test(digits)) digits = `+971${digits.replace(/^0/, "")}`;
    else if (/^0[2-9]\d{7}$/.test(digits)) digits = `+971${digits.slice(1)}`;
    else if (/^03\d{9}$/.test(digits)) digits = `+92${digits.slice(1)}`;
    else if (/^01[3-9]\d{8}$/.test(digits)) digits = `+880${digits.slice(1)}`;
    else if (/^0?[6-9]\d{9}$/.test(digits)) digits = `+91${digits.replace(/^0/, "")}`;
    else return null;
  }
  if (!/^\+[1-9]\d{7,14}$/.test(digits)) return null;
  // The trunk 0 must go after the country code: +971 05..., +92 03...,
  // +880 01..., +91 09... are common mistakes.
  for (const code of ["971", "92", "880", "91"]) {
    if (digits.startsWith(`+${code}0`)) digits = `+${code}${digits.slice(code.length + 2)}`;
  }
  return /^\+[1-9]\d{7,14}$/.test(digits) ? digits : null;
}
