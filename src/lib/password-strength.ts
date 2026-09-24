// Strength estimate for the signup meter: roughly the bits of guessing work,
// from the character variety and the length, discounting predictable runs
// ("1234", "aaaa"). Supabase's leaked-password check is the real gate; this
// only guides people toward better choices.

const COMMON_FRAGMENTS = [
  "password",
  "passw0rd",
  "qwerty",
  "123456",
  "111111",
  "abc123",
  "letmein",
  "welcome",
  "admin",
  "iloveyou",
  "monkey",
  "dragon",
  "wemuste",
];

export type StrengthScore = 0 | 1 | 2 | 3 | 4;

export function passwordStrength(value: string): StrengthScore {
  if (value.length < 10) return 0;

  const lower = value.toLowerCase();
  if (COMMON_FRAGMENTS.some((fragment) => lower.includes(fragment))) return 1;
  if (new Set(value).size < 5) return 1;

  const pool =
    (/[a-z]/.test(value) ? 26 : 0) +
    (/[A-Z]/.test(value) ? 26 : 0) +
    (/\d/.test(value) ? 10 : 0) +
    (/[^A-Za-z0-9]/.test(value) ? 33 : 0);

  // A character that repeats or continues a run (a→b, 3→4, 9→8) adds little.
  let effective = 1;
  for (let i = 1; i < value.length; i++) {
    const step = value.charCodeAt(i) - value.charCodeAt(i - 1);
    effective += Math.abs(step) <= 1 ? 0.5 : 1;
  }

  const bits = effective * Math.log2(pool);
  if (bits < 40) return 1;
  if (bits < 55) return 2;
  if (bits < 70) return 3;
  return 4;
}

// What to suggest when a password is weak or fair.
export function strengthTip(value: string): "longer" | "mix" | null {
  const score = passwordStrength(value);
  if (score >= 3 || value.length < 10) return null;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(value)).length;
  return classes < 3 ? "mix" : "longer";
}
