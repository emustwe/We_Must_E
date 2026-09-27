// Gives every UAE partner job its role's interview, in the same pattern as
// the real job: a Test (25 questions, 25 min), a Task (full profile, CV,
// 7 x 30 s videos, 25 min) and the real Survey (25 questions, 25 min). The
// jobs are then shown as normal jobs (no "Example" label) and people can apply.
// (Jobs in Pakistan, India and Bangladesh: setup-partner-jobs.mts.)
//
//   npx tsx scripts/setup-partner-interviews.mts          (local stack)
//   npx tsx scripts/setup-partner-interviews.mts --prod   (live project)
//
// The questions are in scripts/partner-interviews/ (one Role per job title).
// New role? Add it there and run this again: what already exists is reused,
// never duplicated. Only live (published) jobs are changed.
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_env.mjs";
import { ROLES } from "./partner-interviews/build.mjs";
import { check, partnerStore, userId } from "./partner-interviews/store.mjs";

const { url, key, file } = loadEnv();
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const store = partnerStore(db);

const PARTNER_SPONSOR_EMAIL = "practice-jobs@wemuste.com";

console.log(`Setting up the partner interviews (${file})`);

const partner = await userId(db, PARTNER_SPONSOR_EMAIL);
if (!partner)
  throw new Error(`No account for ${PARTNER_SPONSOR_EMAIL} (run setup-real-interview first)`);

const surveyId = await store.survey();

let createdSets = 0;
let updatedJobs = 0;
const noJobs: string[] = [];
for (const role of ROLES) {
  const set = await store.interview(role);
  if (set.created) createdSets++;
  const jobs = check(
    `assign ${role.title}`,
    await db
      .from("jobs")
      .update({
        test_id: set.testId,
        video_set_id: set.videoSetId,
        survey_id: surveyId,
        full_profile: true,
        is_example: false,
      })
      .eq("employer_id", partner)
      .eq("title", role.title)
      .eq("country_code", "AE")
      .eq("status", "published")
      .select("id"),
  );
  if (!jobs?.length) noJobs.push(role.title);
  updatedJobs += jobs?.length ?? 0;
}
console.log(`  roles: ${ROLES.length} (${createdSets} new interview sets)`);
console.log(`  UAE partner jobs with their role's interview: ${updatedJobs}`);
if (noJobs.length) console.log(`  roles with no live UAE jobs: ${noJobs.join(", ")}`);

// Any live partner job whose title has no role yet keeps the example label.
const left = check(
  "jobs without a role",
  await db
    .from("jobs")
    .select("title")
    .eq("employer_id", partner)
    .eq("is_example", true)
    .eq("status", "published"),
);
if (left?.length) {
  const titles = [...new Set(left.map((j) => j.title))].join(", ");
  console.log(`  still example jobs (no role written yet): ${left.length} (${titles})`);
}
console.log("Done.");
