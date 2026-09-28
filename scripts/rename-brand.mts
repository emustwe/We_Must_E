// The platform is called "WemustE": puts the "Meaning of E" test question in
// every saved interview back to its original wording (it briefly said
// "Our name, Muste, …").
//
//   npx tsx scripts/rename-brand.mts          (local stack)
//   npx tsx scripts/rename-brand.mts --prod   (live project)
//
// Safe to run twice.
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_env.mjs";

const { url, key, file } = loadEnv();
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
console.log(`WemustE: restoring the "Meaning of E" question (${file})`);

const FROM = "Our name, Muste, comes from one simple idea:\n“Must E.”";
const TO = "Once upon a time, we believed in one simple idea:\n“We Must E.”";

const { data: questions, error } = await db
  .from("test_questions")
  .select("id, prompt")
  .like("prompt", "%Our name, Muste,%");
if (error) throw new Error(`find questions: ${error.message}`);
for (const q of questions ?? []) {
  const { error: e } = await db
    .from("test_questions")
    .update({ prompt: q.prompt.replace(FROM, TO) })
    .eq("id", q.id);
  if (e) throw new Error(`update question: ${e.message}`);
}
console.log(`  questions restored: ${questions?.length ?? 0}`);
console.log("Done.");
