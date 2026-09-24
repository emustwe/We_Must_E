import { ArrowLeft, FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { setEmployeeStatus, setVideoStatus } from "@/actions/admin-panel";
import { ActionButton } from "@/components/admin/action-button";
import { Badge, Card, EMPLOYEE_TONE } from "@/components/admin/ui";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validations/jobs";

export const metadata: Metadata = { title: "Job seeker" };

const VIDEO_TONE = { uploaded: "warning", approved: "success", rejected: "danger" } as const;

function formatAnswer(answer: unknown) {
  if (Array.isArray(answer)) return answer.join(", ");
  return String(answer ?? "—");
}

export default async function AdminEmployeePage({ params }: PageProps<"/admin/employees/[id]">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const t = await getTranslations("admin");
  const ts = await getTranslations("schedule");
  const tr = await getTranslations("requestStatus");
  const format = await getFormatter();
  const supabase = await createClient();

  // Admin reads everything through RLS (MFA required).
  const [
    { data: employee },
    { data: person },
    { data: contact },
    { data: responses },
    { data: attempts },
    { data: videos },
    { data: cv },
    { data: requests },
    { data: grants },
  ] = await Promise.all([
    supabase.from("employee_profiles").select("*").eq("user_id", id).maybeSingle(),
    supabase.from("profiles").select("full_name, created_at").eq("id", id).maybeSingle(),
    supabase
      .from("employee_contacts")
      .select("phone, email, whatsapp")
      .eq("user_id", id)
      .maybeSingle(),
    supabase
      .from("survey_responses")
      .select(
        "id, submitted_at, surveys(title), survey_answers(answer, survey_questions(prompt, position))",
      )
      .eq("employee_id", id),
    supabase
      .from("test_attempts")
      .select("id, score, started_at, submitted_at, tests(title, pass_score)")
      .eq("employee_id", id),
    supabase
      .from("video_resumes")
      .select("id, storage_path, status, duration_seconds, video_prompts(prompt)")
      .eq("employee_id", id),
    supabase
      .from("cv_documents")
      .select("storage_path, mime_type, size_bytes")
      .eq("employee_id", id)
      .maybeSingle(),
    supabase
      .from("job_applications")
      .select("id, status, created_at, jobs(title), employer_profiles(company_name)")
      .eq("employee_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("access_grants")
      .select("id, scopes, expires_at, employer_profiles(company_name)")
      .eq("employee_id", id)
      .is("revoked_at", null),
  ]);
  if (!employee) notFound();

  // Five-minute signed links for media (storage RLS: MFA admin only).
  const videoPaths = (videos ?? []).map((v) => v.storage_path);
  const [{ data: videoUrls }, cvUrl] = await Promise.all([
    videoPaths.length
      ? supabase.storage.from("video-resumes").createSignedUrls(videoPaths, 300)
      : Promise.resolve({ data: [] }),
    cv
      ? supabase.storage.from("cv-documents").createSignedUrl(cv.storage_path, 300)
      : Promise.resolve({ data: null }),
  ]);
  const urlFor = new Map((videoUrls ?? []).map((u) => [u.path, u.signedUrl]));
  const status = employee.status;

  return (
    <div className="space-y-5">
      <Link
        href="/admin/employees"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        {t("back")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{person?.full_name || "—"}</h1>
          <p className="text-muted-foreground">{employee.headline ?? t("noneYet")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={EMPLOYEE_TONE[status]}>{t(`employeeStatus.${status}`)}</Badge>
          {status === "submitted" || status === "hidden" ? (
            <ActionButton
              size="pill"
              action={setEmployeeStatus.bind(null, { employeeId: id, status: "approved" })}
              success={t("saved")}
            >
              {status === "hidden" ? t("unhide") : t("approveProfile")}
            </ActionButton>
          ) : null}
          {status === "approved" || status === "submitted" ? (
            <ActionButton
              size="pill"
              variant="ghost"
              className="text-destructive"
              action={setEmployeeStatus.bind(null, { employeeId: id, status: "hidden" })}
              success={t("saved")}
            >
              {t("hideProfile")}
            </ActionButton>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-bold">{t("profileSection")}</h2>
          <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="text-muted-foreground">{t("city")}</dt>
            <dd>{employee.city_emirate ?? "—"}</dd>
            <dt className="text-muted-foreground">{t("languages")}</dt>
            <dd>{employee.languages.join(", ") || "—"}</dd>
            <dt className="text-muted-foreground">{t("skills")}</dt>
            <dd>{employee.skills.join(", ") || "—"}</dd>
            <dt className="text-muted-foreground">{t("availability")}</dt>
            <dd>{employee.availability.map((a) => ts(a)).join(", ") || "—"}</dd>
            <dt className="text-muted-foreground">{t("pay")}</dt>
            <dd>{employee.expected_pay_range ?? "—"}</dd>
          </dl>
        </Card>
        <Card>
          <h2 className="mb-3 font-bold">{t("contactSection")}</h2>
          <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="text-muted-foreground">{t("contactEmail")}</dt>
            <dd className="break-all">{contact?.email ?? "—"}</dd>
            <dt className="text-muted-foreground">{t("phone")}</dt>
            <dd dir="ltr" className="text-start">
              {contact?.phone ?? "—"}
            </dd>
            <dt className="text-muted-foreground">WhatsApp</dt>
            <dd dir="ltr" className="text-start">
              {contact?.whatsapp ?? "—"}
            </dd>
          </dl>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-bold">{t("videoSection")}</h2>
        {!videos?.length ? (
          <p className="text-sm text-muted-foreground">{t("noVideos")}</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {videos.map((v) => (
              <li key={v.id} className="space-y-2">
                <p className="text-sm font-semibold">{v.video_prompts?.prompt}</p>
                {urlFor.get(v.storage_path) ? (
                  <video
                    src={urlFor.get(v.storage_path) ?? undefined}
                    controls
                    playsInline
                    preload="metadata"
                    className="aspect-video w-full rounded-2xl bg-foreground"
                  />
                ) : null}
                <div className="flex items-center gap-2">
                  <Badge tone={VIDEO_TONE[v.status]}>{t(`videoStatus.${v.status}`)}</Badge>
                  {v.status !== "approved" ? (
                    <ActionButton
                      size="pill"
                      action={setVideoStatus.bind(null, { videoId: v.id, status: "approved" })}
                    >
                      {t("approve")}
                    </ActionButton>
                  ) : null}
                  {v.status !== "rejected" ? (
                    <ActionButton
                      size="pill"
                      variant="ghost"
                      className="text-destructive"
                      action={setVideoStatus.bind(null, { videoId: v.id, status: "rejected" })}
                    >
                      {t("reject")}
                    </ActionButton>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-bold">{t("testSection")}</h2>
          {!attempts?.length ? (
            <p className="text-sm text-muted-foreground">{t("notSubmitted")}</p>
          ) : (
            attempts.map((a) => (
              <p key={a.id} className="text-sm">
                <span className="font-semibold">{a.tests?.title}</span> ·{" "}
                {a.submitted_at
                  ? t("attempt", {
                      score: Math.round(Number(a.score ?? 0)),
                      pass: Number(a.tests?.pass_score ?? 0),
                    })
                  : t("notSubmitted")}
              </p>
            ))
          )}
        </Card>
        <Card>
          <h2 className="mb-3 font-bold">{t("cvSection")}</h2>
          {cv && cvUrl.data?.signedUrl ? (
            <a
              href={cvUrl.data.signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              <FileText className="size-4" aria-hidden="true" />
              {t("openCv")} · {Math.round(cv.size_bytes / 1024)} KB
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noCv")}</p>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-bold">{t("surveySection")}</h2>
        {!responses?.length ? (
          <p className="text-sm text-muted-foreground">{t("noAnswers")}</p>
        ) : (
          responses.map((r) => (
            <div key={r.id} className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">{r.surveys?.title}</p>
              <dl className="space-y-2">
                {[...r.survey_answers]
                  .sort(
                    (a, b) =>
                      (a.survey_questions?.position ?? 0) - (b.survey_questions?.position ?? 0),
                  )
                  .map((a, i) => (
                    <div key={i} className="rounded-2xl bg-muted/60 p-3 text-sm">
                      <dt className="font-semibold">{a.survey_questions?.prompt}</dt>
                      <dd className="mt-0.5 text-muted-foreground">{formatAnswer(a.answer)}</dd>
                    </div>
                  ))}
              </dl>
            </div>
          ))
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-bold">{t("requestsSection")}</h2>
          {!requests?.length ? (
            <p className="text-sm text-muted-foreground">{t("noneYet")}</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {requests.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">
                    {r.jobs?.title} ·{" "}
                    <span className="text-muted-foreground">
                      {r.employer_profiles?.company_name}
                    </span>
                  </span>
                  <Badge>{tr(r.status)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 font-bold">{t("grantsSection")}</h2>
          {!grants?.length ? (
            <p className="text-sm text-muted-foreground">{t("noneYet")}</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {grants.map((g) => (
                <li key={g.id}>
                  <span className="font-semibold">{g.employer_profiles?.company_name}</span> ·{" "}
                  {g.scopes.map((s) => t(`scopes.${s as "profile"}`)).join(", ")} ·{" "}
                  {g.expires_at
                    ? t("expires", {
                        date: format.dateTime(new Date(g.expires_at), { dateStyle: "medium" }),
                      })
                    : t("noExpiry")}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
