// Posts the partner jobs in Pakistan (1,000), India (1,000) and Bangladesh
// (500) for the internal partner account, each with its role's interview
// (Test, Task with full profile, CV and videos, Survey), in the cities and
// areas of scripts/partner-jobs/ (checked points in places.json).
//
//   npx tsx scripts/setup-partner-jobs.mts --dry     (print the plan only)
//   npx tsx scripts/setup-partner-jobs.mts           (local stack)
//   npx tsx scripts/setup-partner-jobs.mts --prod    (live project)
//
// A country that already has partner jobs is skipped, so running it twice
// never doubles the jobs. The same pattern every time (no randomness).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_env.mjs";
import { ROLES } from "./partner-interviews/build.mjs";
import { check, partnerStore, userId } from "./partner-interviews/store.mjs";
import { CATALOG, type PartnerRole } from "./partner-jobs/catalog.mjs";
import { CITIES, COUNTRY_NAMES, type City } from "./partner-jobs/cities.mjs";
import type { Places } from "./partner-jobs/geocode.mjs";

const dry = process.argv.includes("--dry");
const PARTNER_SPONSOR_EMAIL = "practice-jobs@wemuste.com";
const places: Places = JSON.parse(
  readFileSync(join(import.meta.dirname, "partner-jobs", "places.json"), "utf8"),
);

// Every catalog role needs its interview and every city its checked areas.
for (const r of CATALOG) {
  if (!ROLES.some((x) => x.title === (r.role ?? r.title)))
    throw new Error(`no interview: ${r.title}`);
}
for (const c of CITIES) {
  const p = places[`${c.country}:${c.city}`];
  if (!p || p.areas.length < 2) throw new Error(`run geocode.mts: ${c.city} has too few areas`);
}

// How many jobs of each role a city gets: its share by weight (factory
// roles mostly in industrial cities), rounded so the total is exact.
function allocate(city: City): [PartnerRole, number][] {
  const w = CATALOG.map((r) => {
    const base = r.weight[city.country] ?? 0;
    return base * (r.factory ? (city.industrial ? 2.5 : 0.15) : 1);
  });
  const sum = w.reduce((a, b) => a + b, 0);
  const exact = w.map((x) => (x / sum) * city.count);
  const counts = exact.map(Math.floor);
  const order = exact.map((x, i) => [x - Math.floor(x), i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; counts.reduce((a, b) => a + b, 0) < city.count; k++) counts[order[k][1]]++;
  return CATALOG.map((r, i) => [r, counts[i]] as [PartnerRole, number]).filter(([, n]) => n > 0);
}

// Roles spread evenly through the list, so every area gets a mix.
function interleave(parts: [PartnerRole, number][]) {
  return parts
    .flatMap(([r, n]) => Array.from({ length: n }, (_, i) => ({ r, at: (i + 0.5) / n })))
    .sort((a, b) => a.at - b.at || a.r.title.localeCompare(b.r.title))
    .map((x) => x.r);
}

const plan = CITIES.map((city) => ({ city, roles: interleave(allocate(city)) }));

if (dry) {
  for (const cc of ["PK", "IN", "BD"] as const) {
    const cities = plan.filter((p) => p.city.country === cc);
    const total = cities.reduce((a, p) => a + p.roles.length, 0);
    const byRole = new Map<string, number>();
    for (const p of cities)
      for (const r of p.roles) byRole.set(r.title, (byRole.get(r.title) ?? 0) + 1);
    console.log(`\n${COUNTRY_NAMES[cc]}: ${total} jobs`);
    console.log(`  ${cities.map((p) => `${p.city.city} ${p.roles.length}`).join(", ")}`);
    console.log(
      `  ${[...byRole]
        .sort((a, b) => b[1] - a[1])
        .map(([t, n]) => `${t} ${n}`)
        .join(", ")}`,
    );
  }
  process.exit(0);
}

const { url, key, file } = loadEnv();
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const store = partnerStore(db);
console.log(`Posting the partner jobs (${file})`);

const partner = await userId(db, PARTNER_SPONSOR_EMAIL);
if (!partner)
  throw new Error(`No account for ${PARTNER_SPONSOR_EMAIL} (run setup-real-interview first)`);
const surveyId = await store.survey();
const interviews = new Map<string, { testId: string; videoSetId: string }>();

for (const cc of ["PK", "IN", "BD"] as const) {
  const { count, error } = await db
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("employer_id", partner)
    .eq("country_code", cc);
  if (error) throw new Error(`count ${cc} jobs: ${error.message}`);
  if (count) {
    console.log(`  ${COUNTRY_NAMES[cc]}: ${count} partner jobs already there, skipped`);
    continue;
  }

  const rows = [];
  for (const { city, roles } of plan.filter((p) => p.city.country === cc)) {
    const { areas } = places[`${cc}:${city.city}`];
    for (const [i, r] of roles.entries()) {
      const roleTitle = r.role ?? r.title;
      const k = `${roleTitle}:${cc}`;
      if (!interviews.has(k)) {
        interviews.set(
          k,
          await store.interview(
            ROLES.find((x) => x.title === roleTitle)!,
            cc,
          ),
        );
      }
      const { testId, videoSetId } = interviews.get(k)!;
      const area = areas[i % areas.length];
      // Up to ~700 m around the area's centre, the same way every time.
      const jitter = (n: number) => (((i * 37 + n * 11) % 13) - 6) * 0.0011;
      rows.push({
        employer_id: partner,
        title: r.title,
        description: typeof r.description === "string" ? r.description : r.description[cc]!,
        location_label: `${area.name}, ${city.city}`,
        lat: +(area.lat + jitter(1)).toFixed(5),
        lng: +(area.lng + jitter(2)).toFixed(5),
        country_code: cc,
        country_name: COUNTRY_NAMES[cc],
        city: city.city,
        status: "published",
        job_type: r.type,
        test_id: testId,
        video_set_id: videoSetId,
        survey_id: surveyId,
        full_profile: true,
        is_example: false,
      });
    }
  }
  for (let i = 0; i < rows.length; i += 250) {
    check(`add ${cc} jobs`, await db.from("jobs").insert(rows.slice(i, i + 250)));
  }
  console.log(`  ${COUNTRY_NAMES[cc]}: ${rows.length} jobs posted`);
}
console.log(`  interview sets used: ${interviews.size}`);
console.log("Done.");
