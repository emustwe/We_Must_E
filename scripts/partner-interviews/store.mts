// Saving a partner role's interview (Test, Video interview) and the shared
// Survey, for setup-partner-interviews.mts and setup-partner-jobs.mts. Each
// set is found by its title first, so nothing is ever created twice.
import type { SupabaseClient } from "@supabase/supabase-js";
import { REAL_SURVEY } from "../real-survey.mjs";
import { buildTest, buildVideos } from "./build.mjs";
import { localize, type Country } from "./localize.mjs";
import type { Role } from "./types.mjs";

const MIN25 = 25 * 60;

export function check<T>(label: string, result: { data: T; error: { message: string } | null }) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}
function need<T>(label: string, result: { data: T; error: { message: string } | null }) {
  const data = check(label, result);
  if (data === null || data === undefined) throw new Error(`${label}: no row returned`);
  return data as NonNullable<T>;
}

export function partnerStore(db: SupabaseClient) {
  async function ensureTest(title: string, role: Role) {
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
        buildTest(role).map((q, i) => ({
          test_id: test.id,
          type: q.type,
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

  async function ensureVideoSet(title: string, role: Role) {
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
        buildVideos(role).map((prompt, i) => ({
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

  return {
    // The real job's Survey, shared by every partner job.
    async survey() {
      const title = "Partner jobs — Survey";
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
          REAL_SURVEY.map((q, i) => ({
            survey_id: survey.id,
            type: q.type,
            prompt: q.prompt,
            options: q.options ?? [],
            required: true,
            position: i,
          })),
        ),
      );
      console.log(`  survey "${title}": ${REAL_SURVEY.length} questions`);
      return survey.id as string;
    },

    // A role's Test and Video interview for a country: the UAE sets, or a
    // local copy when the role names prices, IDs or addresses ("(PK)").
    async interview(base: Role, country: Country = "AE") {
      const role = localize(base, country);
      const local = JSON.stringify(role) !== JSON.stringify(base);
      const name = local ? `${base.title} (${country})` : base.title;
      const test = await ensureTest(`Partner — ${name} — Test`, role);
      const set = await ensureVideoSet(`Partner — ${name} — Video interview`, role);
      return { testId: test.id, videoSetId: set.id, created: test.created || set.created };
    },
  };
}

export async function userId(db: SupabaseClient, email: string) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => x.email?.toLowerCase() === email);
    if (u) return u.id;
    if (data.users.length < 200) return null;
  }
  return null;
}
