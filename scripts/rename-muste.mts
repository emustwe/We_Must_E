// The platform is now called "Muste": updates the saved texts that still say
// the old name (the "Meaning of E" test question in every interview, and the
// internal partner account's name).
//
//   npx tsx scripts/rename-muste.mts          (local stack)
//   npx tsx scripts/rename-muste.mts --prod   (live project)
//
// Safe to run twice.
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_env.mjs";

const { url, key, file } = loadEnv();
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
console.log(`Renaming to Muste (${file})`);

const OLD = "Once upon a time, we believed in one simple idea:\n“We Must E.”";
const NEW = "Our name, Muste, comes from one simple idea:\n“Must E.”";

const { data: questions, error } = await db
  .from("test_questions")
  .select("id, prompt")
  .like("prompt", "%We Must E%");
if (error) throw new Error(`find questions: ${error.message}`);
for (const q of questions ?? []) {
  const { error: e } = await db
    .from("test_questions")
    .update({ prompt: q.prompt.replace(OLD, NEW) })
    .eq("id", q.id);
  if (e) throw new Error(`update question: ${e.message}`);
}
console.log(`  "Meaning of E" questions updated: ${questions?.length ?? 0}`);

const { data: partner, error: pe } = await db
  .from("employer_profiles")
  .update({ company_name: "Muste partner jobs", contact_person: "Muste" })
  .eq("company_name", "Wemuste practice jobs")
  .select("user_id");
if (pe) throw new Error(`rename partner account: ${pe.message}`);
console.log(`  partner account renamed: ${partner?.length ?? 0}`);
console.log("Done.");
