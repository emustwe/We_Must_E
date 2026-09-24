// Phone numbers are stored in E.164 (+971501234567). Local UAE formats are
// accepted: 050 123 4567, 50 123 4567, 00971 50 123 4567.
export function toE164(input: string, defaultCountry = "971"): string | null {
  let digits = input.trim().replace(/[\s().-]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  if (!digits.startsWith("+")) {
    if (!/^\d+$/.test(digits)) return null;
    // UAE mobiles: 05X XXX XXXX or 5X XXX XXXX.
    if (defaultCountry === "971" && /^0?5\d{8}$/.test(digits)) {
      digits = `+971${digits.replace(/^0/, "")}`;
    } else if (/^0\d{7,10}$/.test(digits)) {
      digits = `+${defaultCountry}${digits.slice(1)}`;
    } else {
      return null;
    }
  }
  if (!/^\+[1-9]\d{7,14}$/.test(digits)) return null;
  // UAE numbers must drop the trunk 0: +971 05... is a common mistake.
  if (digits.startsWith("+9710")) digits = `+971${digits.slice(5)}`;
  return /^\+[1-9]\d{7,14}$/.test(digits) ? digits : null;
}
