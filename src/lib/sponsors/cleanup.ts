import "server-only";
import { logError } from "@/lib/log";
import { LOGO_BUCKET } from "@/lib/sponsors/logo";
import { createAdminClient } from "@/lib/supabase/admin";
import { CV_BUCKET, VIDEO_BUCKET } from "@/server/public-application";

// Before a sponsor account is deleted: removes the files the database cascade
// can't, so no candidate's CV or video is left behind without an owner. Every
// application to the sponsor's jobs (videos, CVs) and the sponsor's logo.
// Service role: storage objects can only be removed with it; the caller has
// already checked who may delete this sponsor.
export async function removeSponsorFiles(employerId: string) {
  const service = createAdminClient();
  const { data: apps, error } = await service
    .from("applications")
    .select("id, cv_path, jobs!inner(employer_id)")
    .eq("jobs.employer_id", employerId);
  if (error) {
    logError("sponsor-files-list", error);
    return false;
  }
  const ids = (apps ?? []).map((a) => a.id);
  const videos: string[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await service
      .from("application_videos")
      .select("storage_path")
      .in("application_id", ids.slice(i, i + 200));
    videos.push(...(data ?? []).map((v) => v.storage_path));
  }
  const cvs = (apps ?? []).map((a) => a.cv_path).filter((p): p is string => Boolean(p));

  const { data: sponsor } = await service
    .from("employer_profiles")
    .select("logo_path")
    .eq("user_id", employerId)
    .maybeSingle();
  // Older logos were kept in a folder named after the sponsor.
  const { data: legacy } = await service.storage.from(LOGO_BUCKET).list(employerId);
  const logos = [
    ...(sponsor?.logo_path ? [sponsor.logo_path] : []),
    ...(legacy ?? []).map((l) => `${employerId}/${l.name}`),
  ];

  let ok = true;
  for (const [bucket, paths] of [
    [VIDEO_BUCKET, videos],
    [CV_BUCKET, cvs],
    [LOGO_BUCKET, logos],
  ] as const) {
    for (let i = 0; i < paths.length; i += 100) {
      const { error: removeError } = await service.storage
        .from(bucket)
        .remove(paths.slice(i, i + 100));
      if (removeError) {
        logError("sponsor-files-remove", removeError);
        ok = false;
      }
    }
  }
  return ok;
}
