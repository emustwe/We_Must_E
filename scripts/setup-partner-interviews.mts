// Gives every partner job its role's interview, in the same pattern as the
// real job: a Test (25 questions, 25 min), a Task (full profile, CV, 7 x 30 s
// videos, 25 min) and the real Survey (25 questions, 25 min). The jobs are
// then shown as normal jobs (no "Example" label) and people can apply.
//
//   npx tsx scripts/setup-partner-interviews.mts          (local stack)
//   npx tsx scripts/setup-partner-interviews.mts --prod   (live project)
//
// The questions are in scripts/partner-interviews/ (one Role per job title).
// New role? Add it there and run this again: what already exists is reused,
// never duplicated. Removed jobs are left as they are.
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_env.mjs";
import { ROLES, buildTest, buildVideos, type TestQ } from "./partner-interviews/build.mjs";
import { REAL_SURVEY, type SurveyQ } from "./real-survey.mjs";

const { url, key, file } = loadEnv();
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const PARTNER_SPONSOR_EMAIL = "practice-jobs@wemuste.com";
const MIN25 = 25 * 60;

function check<T>(label: string, result: { data: T; error: { message: string } | null }) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}
function need<T>(label: string, result: { data: T; error: { message: string } | null }) {
  const data = check(label, result);
  if (data === null || data === undefined) throw new Error(`${label}: no row returned`);
  return data as NonNullable<T>;
}

console.log(`Setting up the partner interviews (${file})`);

async function ensureTest(title: string, qs: TestQ[]) {
  const found = check(
    "find test",
    await db.from("tests").select("id").eq("title", title).maybeSingle(),
  );
  if (found) return { id: found.id as string, created: false };
  const test = need(
    "create test",
    await db
      .from("tests")
      .insert({ title, time_limit_seconds: MIN25, pass_score: 0, is_active: false })
      .select("id")
      .single(),
  );
  check(
    "add test questions",
    await db.from("test_questions").insert(
      qs.map((q, i) => ({
        test_id: test.id,
        type: q.type as "long_text",
        prompt: q.prompt,
        options: q.options ?? [],
        time_limit_seconds: q.time ?? null,
        position: i,
        points: 0,
      })),
    ),
  );
  return { id: test.id as string, created: true };
}

async function ensureVideoSet(title: string, prompts: string[]) {
  const found = check(
    "find video set",
    await db.from("video_question_sets").select("id").eq("title", title).maybeSingle(),
  );
  if (found) return { id: found.id as string, created: false };
  const set = need(
    "create video set",
    await db
      .from("video_question_sets")
      .insert({ title, is_active: false, time_limit_seconds: MIN25 })
      .select("id")
      .single(),
  );
  check(
    "add video questions",
    await db.from("video_questions").insert(
      prompts.map((prompt, i) => ({
        set_id: set.id,
        prompt,
        max_seconds: 30,
        position: i,
        is_active: true,
      })),
    ),
  );
  return { id: set.id as string, created: true };
}

async function ensureSurvey(title: string, qs: SurveyQ[]) {
  const found = check(
    "find survey",
    await db.from("surveys").select("id").eq("title", title).maybeSingle(),
  );
  if (found) return found.id as string;
  const survey = need(
    "create survey",
    await db
      .from("surveys")
      .insert({ title, version: 1, is_active: false, time_limit_seconds: MIN25 })
      .select("id")
      .single(),
  );
  check(
    "add survey questions",
    await db.from("survey_questions").insert(
      qs.map((q, i) => ({
        survey_id: survey.id,
        type: q.type as "long_text",
        prompt: q.prompt,
        options: q.options ?? [],
        required: true,
        position: i,
      })),
    ),
  );
  console.log(`  survey "${title}": ${qs.length} questions`);
  return survey.id as string;
}

async function userId(email: string) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => x.email?.toLowerCase() === email);
    if (u) return u.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

const partner = await userId(PARTNER_SPONSOR_EMAIL);
if (!partner)
  throw new Error(`No account for ${PARTNER_SPONSOR_EMAIL} (run setup-real-interview first)`);

const surveyId = await ensureSurvey("Partner jobs — Survey", REAL_SURVEY);

let createdSets = 0;
let updatedJobs = 0;
const noJobs: string[] = [];
for (const role of ROLES) {
  const test = await ensureTest(`Partner — ${role.title} — Test`, buildTest(role));
  const set = await ensureVideoSet(`Partner — ${role.title} — Video interview`, buildVideos(role));
  if (test.created || set.created) createdSets++;
  const jobs = check(
    `assign ${role.title}`,
    await db
      .from("jobs")
      .update({
        test_id: test.id,
        video_set_id: set.id,
        survey_id: surveyId,
        full_profile: true,
        is_example: false,
      })
      .eq("employer_id", partner)
      .eq("title", role.title)
      .neq("status", "removed")
      .select("id"),
  );
  if (!jobs?.length) noJobs.push(role.title);
  updatedJobs += jobs?.length ?? 0;
}
console.log(`  roles: ${ROLES.length} (${createdSets} new interview sets)`);
console.log(`  partner jobs with their role's interview: ${updatedJobs}`);
if (noJobs.length) console.log(`  roles with no live jobs yet: ${noJobs.join(", ")}`);

// Any live partner job whose title has no role yet keeps the example label.
const left = check(
  "jobs without a role",
  await db
    .from("jobs")
    .select("title")
    .eq("employer_id", partner)
    .eq("is_example", true)
    .neq("status", "removed"),
);
if (left?.length) {
  const titles = [...new Set(left.map((j) => j.title))].join(", ");
  console.log(`  still example jobs (no role written yet): ${left.length} (${titles})`);
}
console.log("Done.");
