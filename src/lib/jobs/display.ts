// How a job is shown in the design: sample content gets a "Sample" badge
// instead of "[SAMPLE]" in its title, pins carry a short label, and jobs
// posted in the last 24 hours are "New".

const SAMPLE = /^\s*\[SAMPLE\]\s*/i;

export const isSample = (title: string) => SAMPLE.test(title);
export const displayTitle = (title: string) => title.replace(SAMPLE, "");

// "Bike delivery rider" -> "Bike delivery rider"; longer titles are cut at a
// word so pins stay short.
export function shortLabel(title: string, max = 18) {
  const clean = displayTitle(title).trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max + 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > 6 ? cut.slice(0, space) : clean.slice(0, max)).replace(/[\s,.;:-]+$/, "")}…`;
}

export const isNewJob = (publishedAt: string, now = Date.now()) =>
  now - new Date(publishedAt).getTime() < 24 * 60 * 60 * 1000;

// Whole days since posting (0 = today), for "Posted today" / "Posted 2 days ago".
export function daysSince(publishedAt: string, now = Date.now()) {
  const start = new Date(publishedAt);
  const a = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const d = new Date(now);
  const b = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.max(0, Math.round((b - a) / 86_400_000));
}
