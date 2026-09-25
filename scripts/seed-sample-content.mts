// Adds placeholder application content and makes it live, so every applicant
// goes through all 3 steps: test -> video -> survey. Everything is marked
// [SAMPLE]; the admin replaces it later under Admin -> Content.
//
//   npx tsx scripts/seed-sample-content.mts          (local stack)
//   npx tsx scripts/seed-sample-content.mts --prod   (live project)
//
// Safe to run twice: a step that already has live content is left alone.
// Uses the service role because it runs outside the app (no admin session).
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_env.mjs";

const { url, key, file } = loadEnv();
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

function check<T>(label: string, result: { data: T; error: { message: string } | null }) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

// Like check(), for single-row inserts that must return the new row.
function need<T>(
  label: string,
  result: { data: T; error: { message: string } | null },
): NonNullable<T> {
  const data = check(label, result);
  if (data === null || data === undefined) throw new Error(`${label}: no row returned`);
  return data;
}

console.log(`Adding sample application content (${file})`);

// ---------------------------------------------------------------- test
const liveTest = check(
  "find live test",
  await db.from("tests").select("id, title").eq("is_active", true).maybeSingle(),
);
if (liveTest) {
  console.log(`  test: already live ("${liveTest.title}"), left as it is`);
} else {
  const test = need(
    "create test",
    await db
      .from("tests")
      .insert({ title: "[SAMPLE] Work readiness test", time_limit_seconds: 600, pass_score: 60 })
      .select("id")
      .single(),
  );
  const questions = [
    {
      type: "single_choice" as const,
      prompt: "[SAMPLE] A customer is upset because their order is late. What do you do first?",
      options: [
        "Ignore it and keep working",
        "Listen, apologise and help",
        "Tell them to come back tomorrow",
      ],
      correct: [1],
    },
    {
      type: "single_choice" as const,
      prompt: "[SAMPLE] Your shift starts at 9:00. When should you arrive?",
      options: ["9:15", "9:00 exactly", "A few minutes before 9:00"],
      correct: [2],
    },
    {
      type: "multi_choice" as const,
      prompt: "[SAMPLE] Which of these are good habits at work? Choose all that apply.",
      options: [
        "Being on time",
        "Using your phone during tasks",
        "Asking when you are unsure",
        "Keeping your area clean",
      ],
      correct: [0, 2, 3],
    },
    {
      type: "single_choice" as const,
      prompt: "[SAMPLE] You break something by accident. What should you do?",
      options: ["Hide it", "Tell your manager straight away", "Blame someone else"],
      correct: [1],
    },
    {
      type: "short_text" as const,
      prompt: "[SAMPLE] In one or two sentences: why would you be good at this job?",
      options: [],
      correct: [],
    },
  ];
  for (const [position, q] of questions.entries()) {
    const row = need(
      "create test question",
      await db
        .from("test_questions")
        .insert({
          test_id: test.id,
          type: q.type,
          prompt: q.prompt,
          options: q.options,
          points: 1,
          position,
        })
        .select("id")
        .single(),
    );
    if (q.correct.length) {
      check(
        "set answer key",
        await db
          .from("test_answer_keys")
          .insert({ question_id: row.id, correct_options: q.correct }),
      );
    }
  }
  check("make test live", await db.from("tests").update({ is_active: true }).eq("id", test.id));
  console.log(`  test: created with ${questions.length} questions (10 minutes) and made live`);
}

// ---------------------------------------------------------------- video
const liveSet = check(
  "find live video set",
  await db.from("video_question_sets").select("id, title").eq("is_active", true).maybeSingle(),
);
const liveSetHasQuestions = liveSet
  ? Boolean(
      check(
        "count video questions",
        await db
          .from("video_questions")
          .select("id")
          .eq("set_id", liveSet.id)
          .eq("is_active", true)
          .limit(1),
      )?.length,
    )
  : false;
if (liveSet && liveSetHasQuestions) {
  console.log(`  video: already live ("${liveSet.title}"), left as it is`);
} else {
  const set =
    liveSet ??
    need(
      "create video set",
      await db
        .from("video_question_sets")
        .insert({ title: "[SAMPLE] Video questions" })
        .select("id")
        .single(),
    );
  const prompts = [
    {
      prompt: "[SAMPLE] Introduce yourself: your name, where you live and what work you do.",
      max_seconds: 60,
    },
    { prompt: "[SAMPLE] Why do you want this job?", max_seconds: 60 },
    {
      prompt: "[SAMPLE] Tell us about a time you helped a customer or a colleague.",
      max_seconds: 90,
    },
  ];
  for (const [position, p] of prompts.entries()) {
    check(
      "create video question",
      await db.from("video_questions").insert({ set_id: set.id, ...p, position, is_active: true }),
    );
  }
  check(
    "make video set live",
    await db.from("video_question_sets").update({ is_active: true }).eq("id", set.id),
  );
  console.log(`  video: ${prompts.length} questions added and the set made live`);
}

// ---------------------------------------------------------------- survey
const liveSurvey = check(
  "find live survey",
  await db.from("surveys").select("id, title").eq("is_active", true).maybeSingle(),
);
if (liveSurvey) {
  console.log(`  survey: already live ("${liveSurvey.title}"), left as it is`);
} else {
  const survey = need(
    "create survey",
    await db.from("surveys").insert({ title: "[SAMPLE] About you" }).select("id").single(),
  );
  // Name, phone and email are always asked; these come after them.
  const questions = [
    {
      type: "short_text" as const,
      prompt: "[SAMPLE] Which city do you live in?",
      options: [],
      required: true,
    },
    {
      type: "multi_choice" as const,
      prompt: "[SAMPLE] Which languages do you speak?",
      options: ["English", "Arabic", "Hindi", "Urdu", "Tagalog", "Other"],
      required: true,
    },
    {
      type: "single_choice" as const,
      prompt: "[SAMPLE] When can you start?",
      options: ["Today", "This week", "This month", "Later"],
      required: true,
    },
    {
      type: "multi_choice" as const,
      prompt: "[SAMPLE] When are you available to work?",
      options: ["Mornings", "Evenings", "Weekends", "Full-time"],
      required: true,
    },
    {
      type: "number" as const,
      prompt: "[SAMPLE] How many years of work experience do you have?",
      options: [],
      required: false,
    },
    {
      type: "long_text" as const,
      prompt: "[SAMPLE] Anything else you'd like us to know?",
      options: [],
      required: false,
    },
  ];
  for (const [position, q] of questions.entries()) {
    check(
      "create survey question",
      await db.from("survey_questions").insert({ survey_id: survey.id, ...q, position }),
    );
  }
  check(
    "make survey live",
    await db.from("surveys").update({ is_active: true }).eq("id", survey.id),
  );
  console.log(`  survey: created with ${questions.length} questions and made live`);
}

console.log("Done. New applications now go through the test, the video and the survey.");
