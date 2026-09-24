// One-off, after the v2 migrations: removes what the job-seeker accounts of v1
// left behind, which SQL migrations can't touch on hosted Supabase:
//   - auth users with no profile (former job seekers)
//   - the cv-documents and video-resumes buckets and their files
//
//   npx tsx scripts/cleanup-v1-job-seekers.mts           (dry run, local)
//   npx tsx scripts/cleanup-v1-job-seekers.mts --apply   (delete, local)
//   add --prod to run against the live project
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_env.mjs";

const apply = process.argv.includes("--apply");
const { url, key, file } = loadEnv();
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
console.log(`${apply ? "DELETING" : "Dry run"} against ${file}`);

const { data: profiles, error: profilesError } = await supabase.from("profiles").select("id");
if (profilesError) throw profilesError;
const keep = new Set((profiles ?? []).map((p) => p.id));

let orphans = 0;
for (let page = 1; ; page++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  for (const user of data.users) {
    if (keep.has(user.id)) continue;
    orphans++;
    console.log(`  job-seeker login: ${user.id}`);
    if (apply) await supabase.auth.admin.deleteUser(user.id);
  }
  if (data.users.length < 200) break;
}

for (const bucket of ["cv-documents", "video-resumes"]) {
  const { data: folders } = await supabase.storage.from(bucket).list("", { limit: 1000 });
  let files = 0;
  for (const folder of folders ?? []) {
    const { data: items } = await supabase.storage.from(bucket).list(folder.name, { limit: 1000 });
    const paths = (items ?? []).map((i) => `${folder.name}/${i.name}`);
    files += paths.length;
    if (apply && paths.length) await supabase.storage.from(bucket).remove(paths);
  }
  console.log(`  bucket ${bucket}: ${files} files`);
  if (apply) {
    const { error } = await supabase.storage.deleteBucket(bucket);
    if (error && !/not found/i.test(error.message))
      console.log(`    could not delete bucket: ${error.message}`);
  }
}
console.log(`${orphans} job-seeker logins ${apply ? "deleted" : "found"}.`);
