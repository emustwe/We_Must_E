import "server-only";
import { createClient } from "@/lib/supabase/server";

// Which application steps have live questions. A step with none is skipped
// by applicants, so the admin area warns about it.
export async function missingSteps(): Promise<("test" | "video" | "survey")[]> {
  const supabase = await createClient();
  const [test, video, survey] = await Promise.all([
    supabase.from("tests").select("id, test_questions(count)").eq("is_active", true).maybeSingle(),
    supabase
      .from("video_question_sets")
      .select("id, video_questions(count)")
      .eq("is_active", true)
      .eq("video_questions.is_active", true)
      .maybeSingle(),
    supabase
      .from("surveys")
      .select("id, survey_questions(count)")
      .eq("is_active", true)
      .maybeSingle(),
  ]);
  const missing: ("test" | "video" | "survey")[] = [];
  if (!test.data?.test_questions[0]?.count) missing.push("test");
  if (!video.data?.video_questions[0]?.count) missing.push("video");
  if (!survey.data?.survey_questions[0]?.count) missing.push("survey");
  return missing;
}
