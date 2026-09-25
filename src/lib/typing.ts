// Typing test results, worked out from the paragraph and what was typed. The
// same function runs on the applicant's page and in the admin review.

export type TypingStats = { seconds: number; backspaces: number; keystrokes: number };
export type WrongWord = { position: number; expected: string; typed: string };
export type TypingResult = {
  wpm: number;
  accuracy: number; // % of characters right (edit distance)
  wrongWords: WrongWord[];
  missingWords: number;
};

function editDistance(a: string, b: string) {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const up = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = up;
    }
  }
  return prev[b.length];
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);

export function typingResult(target: string, typed: string, seconds: number): TypingResult {
  const expected = words(target);
  const got = words(typed);
  const wrongWords: WrongWord[] = [];
  got.forEach((w, i) => {
    if (i < expected.length && w !== expected[i])
      wrongWords.push({ position: i + 1, expected: expected[i], typed: w });
    else if (i >= expected.length) wrongWords.push({ position: i + 1, expected: "", typed: w });
  });
  const t = target.trim();
  const accuracy = t.length
    ? Math.max(0, Math.round((1 - editDistance(typed.trim(), t) / t.length) * 100))
    : 0;
  const minutes = Math.max(seconds, 1) / 60;
  return {
    // Standard WPM: 5 characters = 1 word.
    wpm: Math.round(typed.trim().length / 5 / minutes),
    accuracy,
    wrongWords,
    missingWords: Math.max(0, expected.length - got.length),
  };
}
