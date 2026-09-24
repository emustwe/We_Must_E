import type { Database } from "@/types/database";

export type JobCategory = Database["public"]["Enums"]["job_category"];
export type PayPeriod = Database["public"]["Enums"]["pay_period"];
export type Availability = Database["public"]["Enums"]["availability"];
export type ApplicationStatus = Database["public"]["Enums"]["application_status"];
export type JobStatus = Database["public"]["Enums"]["job_status"];

// Emoji pins make the map scannable at a glance (the Nomadtable pattern).
export const CATEGORY_META: Record<JobCategory, { emoji: string; tint: string }> = {
  hospitality: { emoji: "☕", tint: "bg-amber-100 dark:bg-amber-500/20" },
  retail: { emoji: "🛍️", tint: "bg-pink-100 dark:bg-pink-500/20" },
  delivery: { emoji: "🛵", tint: "bg-orange-100 dark:bg-orange-500/20" },
  cleaning: { emoji: "🧽", tint: "bg-sky-100 dark:bg-sky-500/20" },
  construction: { emoji: "🔨", tint: "bg-yellow-100 dark:bg-yellow-500/20" },
  office: { emoji: "💼", tint: "bg-indigo-100 dark:bg-indigo-500/20" },
  tech: { emoji: "💻", tint: "bg-violet-100 dark:bg-violet-500/20" },
  care: { emoji: "🤝", tint: "bg-emerald-100 dark:bg-emerald-500/20" },
  events: { emoji: "🎉", tint: "bg-fuchsia-100 dark:bg-fuchsia-500/20" },
  beauty: { emoji: "💅", tint: "bg-rose-100 dark:bg-rose-500/20" },
  other: { emoji: "✨", tint: "bg-slate-100 dark:bg-slate-500/20" },
};

export const JOB_CATEGORIES = Object.keys(CATEGORY_META) as JobCategory[];
export const PAY_PERIODS: PayPeriod[] = ["hour", "day", "week", "month", "fixed"];
export const AVAILABILITY: Availability[] = [
  "evenings",
  "weekends",
  "part_time",
  "full_time",
  "flexible",
];

export const CITIES = [
  { id: "Dubai", center: [55.2708, 25.2048] as [number, number], zoom: 10.6 },
  { id: "Abu Dhabi", center: [54.3773, 24.4539] as [number, number], zoom: 10.8 },
  { id: "Sharjah", center: [55.4033, 25.3463] as [number, number], zoom: 11 },
  { id: "Ajman", center: [55.5136, 25.4052] as [number, number], zoom: 11.5 },
  { id: "Ras Al Khaimah", center: [55.9432, 25.8007] as [number, number], zoom: 11 },
  { id: "Fujairah", center: [56.3264, 25.1288] as [number, number], zoom: 11.5 },
  { id: "Umm Al Quwain", center: [55.555, 25.5647] as [number, number], zoom: 11.5 },
] as const;

export type CityId = (typeof CITIES)[number]["id"];

// "AED 28–35" (amount only; the period label is translated by the caller).
export function formatPayAmount(min: number, max: number | null, currency: string) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en", { maximumFractionDigits: n % 1 === 0 ? 0 : 2 }).format(n);
  return max && max !== min ? `${currency} ${fmt(min)}–${fmt(max)}` : `${currency} ${fmt(min)}`;
}

// Compact label for map pins: "28" or "4.5k".
export function formatPinAmount(min: number) {
  if (min >= 1000) return `${Math.round(min / 100) / 10}k`;
  return String(Math.round(min));
}

// Closest "show for N days" option covering the time a job has left.
export function expiryOptionFor(expiresAt: string, now = Date.now()) {
  const daysLeft = Math.max(7, Math.round((new Date(expiresAt).getTime() - now) / 86_400_000));
  return ([7, 14, 30, 60, 90] as const).find((d) => d >= daysLeft) ?? 90;
}
