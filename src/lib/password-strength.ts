// Lightweight strength estimate for the signup meter. Supabase's leaked-password
// protection is the real gate; this only nudges people toward better choices.

const COMMON_FRAGMENTS = [
  "password",
  "passw0rd",
  "qwerty",
  "123456",
  "12345678",
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

function hasSequence(value: string) {
  const lower = value.toLowerCase();
  for (let i = 0; i < lower.length - 3; i++) {
    const a = lower.charCodeAt(i);
    if ([1, 2, 3].every((n) => lower.charCodeAt(i + n) === a + n)) return true;
    if ([1, 2, 3].every((n) => lower.charCodeAt(i + n) === a - n)) return true;
  }
  return false;
}

export function passwordStrength(value: string): StrengthScore {
  if (value.length < 10) return 0;

  const lower = value.toLowerCase();
  const isCommon = COMMON_FRAGMENTS.some((fragment) => lower.includes(fragment));
  const repeats = /(.)\1{3,}/.test(value);
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(value)).length;
  const unique = new Set(value).size;

  let score = 1;
  if (value.length >= 14) score++;
  if (classes >= 3) score++;
  if (value.length >= 18 || (classes === 4 && value.length >= 12)) score++;
  if (isCommon || repeats || hasSequence(value) || unique < 5) score = Math.min(score, 1);

  return Math.min(score, 4) as StrengthScore;
}
