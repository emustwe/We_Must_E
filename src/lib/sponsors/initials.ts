// "Harbour Coffee LLC" -> "HC"
export function initials(name: string) {
  const words = name
    .replace(/\b(LLC|L\.L\.C|FZE|FZCO|FZ-LLC|Ltd|Inc|Co)\b\.?/gi, "")
    .split(/\s+/)
    .filter(Boolean);
  return (
    words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)
  ).toUpperCase();
}
