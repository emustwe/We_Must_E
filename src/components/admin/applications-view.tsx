import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { FilterSelect } from "@/components/admin/filter-select";
import {
  CvButton,
  DecisionBar,
  MoreToggle,
  ShowAll,
  VideoTile,
} from "@/components/admin/review-panel";
import {
  APP_PILL,
  Avatar,
  btn,
  displayTitle,
  PageHeader,
  Segmented,
  StatusPill,
  WCard,
} from "@/components/admin/wm";
import { WmIcon, type IconName } from "@/components/map/wm-icons";
import { createClient } from "@/lib/supabase/server";
import { typingResult } from "@/lib/typing";
import { cn } from "@/lib/utils";
import { filterQuery, parseFilters, sinceFor } from "@/lib/admin/app-filters";
import type { Json } from "@/types/database";

const PAGE = 25;
const areaOf = (label: string | null | undefined) => label?.split(",")[0]?.trim() || "—";

export async function ApplicationsView({
  params,
  selectedId,
}: {
  params: Record<string, string | string[] | undefined>;
  selectedId: string | null;
}) {
  const f = parseFilters(params);
  const t = await getTranslations("adminUi");
  const format = await getFormatter();
  const supabase = await createClient();

  let query = supabase
    .from("applications")
    .select(
      "id, status, submitted_at, contact_name, jobs!inner(title, location_label, city, employer_id, employer_profiles(company_name))",
      { count: "exact" },
    )
    .neq("status", "in_progress")
    .order("submitted_at", { ascending: false })
    .range(f.page * PAGE, f.page * PAGE + PAGE - 1);
  if (f.status) query = query.eq("status", f.status);
  if (f.job) query = query.eq("job_id", f.job);
  if (f.sponsor) query = query.eq("jobs.employer_id", f.sponsor);
  if (f.area) query = query.eq("jobs.city", f.area);
  const since = sinceFor(f.date);
  if (since) query = query.gte("submitted_at", since);

  const [{ data: rows, count }, { data: jobs }, { data: sponsors }, { count: toReview }] =
    await Promise.all([
      query,
      supabase
        .from("jobs")
        .select("id, title, city")
        .order("created_at", { ascending: false })
        .limit(300),
      supabase.from("employer_profiles").select("user_id, company_name").order("company_name"),
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("status", "submitted"),
    ]);
  const areas = [
    ...new Set((jobs ?? []).map((j) => j.city).filter((c): c is string => Boolean(c))),
  ].sort();

  // Desktop shows the first row's review next to the list when none is picked.
  const selected = selectedId ?? rows?.[0]?.id ?? null;
  const tab = (s: string, label: string, c?: number) => ({
    href: `/admin/applications${filterQuery({ ...f, statusParam: s, page: 0 })}`,
    label,
    active: f.statusParam === s,
    count: c,
  });
  const qs = filterQuery(f);

  return (
    <>
      <div className={cn(selectedId && "hidden lg:block")}>
        <PageHeader
          title={t("nav.applications")}
          body={t("appsBody")}
          actions={
            <a href={`/admin/applications/export${qs}`} className={btn("secondary")} download>
              <WmIcon name="download" size={17} stroke={2.2} />
              {t("exportCsv")}
            </a>
          }
        />
      </div>
      <div className={cn("flex flex-wrap items-center gap-2.5", selectedId && "hidden lg:flex")}>
        <Segmented
          label={t("nav.applications")}
          items={[
            tab("submitted", t("tabs.toReview"), toReview ?? 0),
            tab("approved", t("tabs.approved")),
            tab("rejected", t("tabs.rejected")),
            tab("all", t("tabs.all")),
          ]}
        />
        <span className="grow" />
        <FilterSelect
          label={t("filterJob")}
          param="job"
          value={f.job ?? ""}
          options={[
            { value: "", label: t("any") },
            ...(jobs ?? []).map((j) => ({ value: j.id, label: displayTitle(j.title) })),
          ]}
        />
        <FilterSelect
          label={t("filterSponsor")}
          param="sponsor"
          value={f.sponsor ?? ""}
          options={[
            { value: "", label: t("any") },
            ...(sponsors ?? []).map((s) => ({ value: s.user_id, label: s.company_name })),
          ]}
        />
        <FilterSelect
          label={t("filterArea")}
          param="area"
          value={f.area ?? ""}
          options={[{ value: "", label: t("any") }, ...areas.map((a) => ({ value: a, label: a }))]}
        />
        <FilterSelect
          label={t("filterDate")}
          param="date"
          value={f.date ?? ""}
          icon="calendar"
          options={[
            { value: "", label: t("anyTime") },
            { value: "today", label: t("today") },
            { value: "7", label: t("last7") },
            { value: "30", label: t("last30") },
          ]}
        />
      </div>

      <div className="flex min-h-0 grow flex-col gap-4 lg:flex-row">
        <section
          className={cn(
            "flex min-w-0 grow flex-col gap-2 rounded-3xl bg-white px-3 py-[18px] shadow-wm-1",
            selectedId && "hidden lg:flex",
          )}
        >
          <div className="hidden grid-cols-12 gap-3 px-4 pb-1.5 text-xs font-bold text-wm-caption sm:grid">
            <span className="col-span-5">{t("col.applicant")}</span>
            <span className="col-span-3">{t("col.area")}</span>
            <span className="col-span-2">{t("col.applied")}</span>
            <span className="col-span-2 text-end">{t("col.status")}</span>
          </div>
          {!rows?.length ? (
            <p className="px-4 py-8 text-center text-sm font-semibold text-wm-caption">
              {t("noApps")}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {rows.map((a) => {
                const on = a.id === selected;
                const name = a.contact_name ?? "—";
                return (
                  <li key={a.id}>
                    <Link
                      href={`/admin/applications/${a.id}${qs}`}
                      aria-current={on ? "true" : undefined}
                      className={cn(
                        "grid grid-cols-12 items-center gap-3 rounded-2xl border px-4 py-3.5 text-wm-ink no-underline",
                        on
                          ? "border-[#EEF0F4] lg:border-wm-blue lg:bg-wm-tint"
                          : "border-[#EEF0F4] bg-white hover:border-wm-tint-line",
                      )}
                    >
                      <span className="col-span-12 flex min-w-0 items-center gap-3 sm:col-span-5">
                        <Avatar name={name} />
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-sm font-bold">{name}</span>
                          <span className="truncate text-[13px] font-medium text-wm-slate">
                            {displayTitle(a.jobs.title)}, {a.jobs.employer_profiles?.company_name}
                          </span>
                        </span>
                      </span>
                      <span className="col-span-4 text-[13px] font-semibold text-wm-body sm:col-span-3">
                        {areaOf(a.jobs.location_label)}
                      </span>
                      <span className="col-span-4 text-[13px] font-semibold text-wm-caption sm:col-span-2">
                        {a.submitted_at
                          ? format.dateTime(new Date(a.submitted_at), {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })
                          : ""}
                      </span>
                      <span className="col-span-4 flex justify-end sm:col-span-2">
                        <StatusPill tone={APP_PILL[a.status]}>
                          {t(`appStatus.${a.status}`)}
                        </StatusPill>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 px-4 pt-2">
            <span className="text-[13px] font-semibold text-wm-caption">
              {t("showing", { count: count ?? 0 })}
            </span>
            <span className="flex gap-2">
              {f.page > 0 ? (
                <Link
                  href={`/admin/applications${filterQuery(f, { page: String(f.page - 1) })}`}
                  className={btn("secondary", "sm")}
                >
                  {t("prev")}
                </Link>
              ) : null}
              {(f.page + 1) * PAGE < (count ?? 0) ? (
                <Link
                  href={`/admin/applications${filterQuery(f, { page: String(f.page + 1) })}`}
                  className={btn("secondary", "sm")}
                >
                  {t("next")}
                </Link>
              ) : null}
            </span>
          </div>
        </section>

        {selected ? (
          <div className={cn("w-full shrink-0 lg:w-[520px]", !selectedId && "hidden lg:block")}>
            {selectedId ? (
              <Link
                href={`/admin/applications${qs}`}
                className="mb-3 inline-flex items-center gap-1.5 text-sm font-bold text-wm-slate no-underline lg:hidden"
              >
                <WmIcon name="arrowLeft" size={16} stroke={2.2} />
                {t("back")}
              </Link>
            ) : null}
            <ApplicationPanel id={selected} />
          </div>
        ) : null}
      </div>
    </>
  );
}

const asOptions = (v: Json) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
const field = (answer: Json | undefined, key: string) =>
  answer && typeof answer === "object" && !Array.isArray(answer) ? answer[key] : undefined;
function answerText(q: { type: string; options: Json }, a: Json | undefined) {
  if (a === undefined) return null;
  if (q.type === "single_choice" || q.type === "multi_choice") {
    const picked = field(a, "options");
    const opts = asOptions(q.options);
    const other = field(a, "other");
    return (Array.isArray(picked) ? picked : [])
      .filter((x): x is number => typeof x === "number")
      .map((i) =>
        typeof other === "string" && /^other\b/i.test(opts[i] ?? "")
          ? `${opts[i]}: ${other}`
          : opts[i],
      )
      .filter(Boolean)
      .join(", ");
  }
  const v = field(a, "text") ?? field(a, "number");
  return v === undefined || v === null ? null : String(v);
}

const PROFILE_ORDER = [
  "preferredName",
  "age",
  "gender",
  "country",
  "city",
  "nationality",
  "languages",
  "englishLevel",
  "otherLanguages",
  "previousEmployment",
  "previousPosition",
  "yearsExperience",
  "previousExperience",
  "whyInterested",
  "workEnvironment",
  "lookingFor",
];

// Speed, accuracy, backspaces and wrong words of a typing answer.
function typingSummary(options: Json, a: Json | undefined) {
  const paragraph = asOptions(options)[0] ?? "";
  const text = field(a, "text");
  const stats = field(a, "stats");
  if (typeof text !== "string" || !stats || typeof stats !== "object" || Array.isArray(stats))
    return null;
  const seconds = Number(stats.seconds) || 1;
  const r = typingResult(paragraph, text, seconds);
  return {
    numbers: {
      wpm: r.wpm,
      accuracy: r.accuracy,
      backspaces: Number(stats.backspaces) || 0,
      seconds,
      wrong: r.wrongWords.length,
      missing: r.missingWords,
    },
    wrong: r.wrongWords
      .slice(0, 20)
      .map((w) => `${w.typed || "—"} → ${w.expected || "(extra)"}`)
      .join(", "),
  };
}

function Section({
  icon,
  title,
  meta,
  children,
}: {
  icon: IconName;
  title: string;
  meta: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[18px] border border-wm-line p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-wm-tint text-wm-blue">
          <WmIcon name={icon} size={16} stroke={2.2} />
        </span>
        <h2 className="m-0 text-sm font-extrabold">{title}</h2>
        <span className="ms-auto text-xs font-bold whitespace-nowrap text-wm-caption">{meta}</span>
      </div>
      {children}
    </div>
  );
}

async function ApplicationPanel({ id }: { id: string }) {
  const t = await getTranslations("adminUi");
  const format = await getFormatter();
  const supabase = await createClient();

  // RLS: only MFA admins can read these tables.
  const { data: app } = await supabase
    .from("applications")
    .select(
      "id, status, submitted_at, admin_notes, test_id, survey_id, applicant_id, profile, cv_path, contact_name, contact_phone, contact_email, jobs(title, location_label, employer_profiles(company_name))",
    )
    .eq("id", id)
    .neq("status", "in_progress")
    .maybeSingle();
  if (!app || !app.contact_name || !app.contact_phone || app.status === "in_progress") {
    return <WCard className="p-6 text-sm font-semibold text-wm-caption">{t("selectApp")}</WCard>;
  }

  const [test, testQs, testAs, videos, surveyQs, surveyAs, history, consent] = await Promise.all([
    app.test_id
      ? supabase.from("tests").select("title").eq("id", app.test_id).maybeSingle()
      : Promise.resolve({ data: null }),
    app.test_id
      ? supabase
          .from("test_questions")
          .select("id, type, prompt, options")
          .eq("test_id", app.test_id)
          .order("position")
      : Promise.resolve({ data: [] }),
    supabase
      .from("application_test_answers")
      .select("question_id, answer")
      .eq("application_id", app.id),
    supabase
      .from("application_videos")
      .select("id, duration_seconds, video_questions(prompt, position)")
      .eq("application_id", app.id)
      .order("uploaded_at"),
    app.survey_id
      ? supabase
          .from("survey_questions")
          .select("id, type, prompt, options")
          .eq("survey_id", app.survey_id)
          .order("position")
      : Promise.resolve({ data: [] }),
    supabase
      .from("application_survey_answers")
      .select("question_id, answer")
      .eq("application_id", app.id),
    supabase
      .from("applications")
      .select("id, status, submitted_at, jobs(title)")
      .eq("applicant_id", app.applicant_id!)
      .neq("id", app.id)
      .neq("status", "in_progress")
      .order("submitted_at", { ascending: false })
      .limit(10),
    supabase
      .from("consents")
      .select("text_version, accepted_at")
      .eq("application_id", app.id)
      .maybeSingle(),
  ]);

  // The Task profile (the contact fields are in the header and "…").
  const ta = await getTranslations("apply");
  const profile =
    app.profile && typeof app.profile === "object" && !Array.isArray(app.profile)
      ? (app.profile as Record<string, Json>)
      : {};
  const profileRows = PROFILE_ORDER.filter(
    (k) => profile[k] !== undefined && profile[k] !== "",
  ).map((k) => {
    const v = String(profile[k]);
    const shown =
      k === "gender"
        ? ta(`genderOption.${v}` as never)
        : k === "englishLevel"
          ? ta(`englishOption.${v}` as never)
          : v;
    return [ta(`profile.${k}` as never), shown] as const;
  });
  const testAnswer = new Map((testAs.data ?? []).map((a) => [a.question_id, a.answer]));
  const surveyAnswer = new Map((surveyAs.data ?? []).map((a) => [a.question_id, a.answer]));
  const surveyItems = (surveyQs.data ?? []).map((q) => ({
    q,
    text: answerText(q, surveyAnswer.get(q.id)),
  }));
  // What this applicant gave with this application (never another one's).
  const applicant = {
    full_name: app.contact_name,
    phone_e164: app.contact_phone,
    email: app.contact_email,
  };
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <section
      aria-labelledby="app-name"
      className="flex flex-col gap-3.5 rounded-3xl bg-white p-[22px] shadow-wm-1"
    >
      <div className="flex flex-wrap items-center gap-3.5">
        <Avatar name={applicant.full_name} size={52} />
        <div className="flex min-w-0 grow basis-40 flex-col gap-[3px]">
          <span className="flex flex-wrap items-center gap-2">
            <h1 id="app-name" className="m-0 text-xl font-extrabold tracking-[-0.4px] break-words">
              {applicant.full_name}
            </h1>
            <StatusPill tone={APP_PILL[app.status]}>{t(`appStatus.${app.status}`)}</StatusPill>
          </span>
          <span className="text-[13px] font-medium text-wm-slate">
            {app.submitted_at
              ? t("appliedAt", {
                  date: format.dateTime(new Date(app.submitted_at), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }),
                })
              : ""}
          </span>
        </div>
        <MoreToggle>
          <div className="mt-1 grid gap-2 rounded-2xl bg-wm-mist p-3.5 text-[13px]">
            <p className="m-0 font-extrabold">{t("contact")}</p>
            <a
              href={`tel:${applicant.phone_e164}`}
              dir="ltr"
              className="font-bold text-wm-blue no-underline"
            >
              {applicant.phone_e164}
            </a>
            {applicant.email ? (
              <a
                href={`mailto:${applicant.email}`}
                className="font-bold break-all text-wm-blue no-underline"
              >
                {applicant.email}
              </a>
            ) : null}
            <p className="m-0 font-medium text-wm-slate">
              {t("consent")}:{" "}
              {consent.data
                ? `${format.dateTime(new Date(consent.data.accepted_at), { dateStyle: "medium" })} · ${consent.data.text_version}`
                : "—"}
            </p>
            <p className="m-0 mt-1 font-extrabold">{t("earlier")}</p>
            {history.data?.length ? (
              <ul className="m-0 grid gap-1 p-0">
                {history.data.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-2">
                    <Link
                      href={`/admin/applications/${h.id}`}
                      className="truncate font-bold text-wm-blue no-underline"
                    >
                      {displayTitle(h.jobs?.title ?? "—")}
                    </Link>
                    <StatusPill tone={APP_PILL[h.status]}>{t(`appStatus.${h.status}`)}</StatusPill>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 font-medium text-wm-slate">{t("noEarlier")}</p>
            )}
          </div>
        </MoreToggle>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {[
          [t("job"), displayTitle(app.jobs?.title ?? "—")],
          [t("sponsor"), app.jobs?.employer_profiles?.company_name ?? "—"],
          [t("area"), areaOf(app.jobs?.location_label)],
        ].map(([label, value]) => (
          <div key={label} className="flex min-w-0 flex-col gap-0.5 rounded-[14px] bg-wm-mist p-3">
            <span className="text-xs font-semibold text-wm-caption">{label}</span>
            <span className="truncate text-[13px] font-bold">{value}</span>
          </div>
        ))}
      </div>

      {profileRows.length ? (
        <Section
          icon="building"
          title={t("profileTitle")}
          meta={app.cv_path ? t("cvAttached") : ""}
        >
          <dl className="m-0 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {profileRows.map(([label, value]) => (
              <div key={label} className="flex min-w-0 flex-col gap-0.5">
                <dt className="text-xs font-semibold text-wm-caption">{label}</dt>
                <dd className="m-0 text-sm font-bold break-words whitespace-pre-line">{value}</dd>
              </div>
            ))}
          </dl>
          {app.cv_path ? <CvButton applicationId={app.id} /> : null}
        </Section>
      ) : null}

      <Section
        icon="flask"
        title={test.data?.title ? displayTitle(test.data.title) : t("testAnswers")}
        meta={t("answersCount", { count: testAnswer.size })}
      >
        {!testQs.data?.length ? (
          <p className="m-0 text-[13px] font-medium text-wm-caption">{t("noTest")}</p>
        ) : (
          <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
            {testQs.data.map((q, i) => {
              const text = answerText(q, testAnswer.get(q.id));
              const typing =
                q.type === "typing" ? typingSummary(q.options, testAnswer.get(q.id)) : null;
              return (
                <li key={q.id} className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-medium whitespace-pre-line text-wm-slate">
                    {i + 1}. {q.prompt}
                  </span>
                  {typing ? (
                    <span className="my-1 rounded-xl bg-wm-tint px-3 py-2 text-[13px] font-bold text-wm-blue">
                      {t("typingResult", typing.numbers)}
                      {typing.wrong ? (
                        <span className="mt-1 block font-medium text-wm-body">
                          {t("typingWrong")}: {typing.wrong}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "text-sm font-bold whitespace-pre-line",
                      text ? "text-wm-ink" : "text-wm-caption",
                    )}
                  >
                    {text || t("notAnswered")}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </Section>

      <Section
        icon="video"
        title={t("videoAnswer")}
        meta={t("videosCount", { count: videos.data?.length ?? 0 })}
      >
        {videos.data?.length ? (
          <div className="flex flex-wrap gap-2.5">
            {[...videos.data]
              .sort(
                (a, b) =>
                  (a.video_questions?.position ?? 999) - (b.video_questions?.position ?? 999),
              )
              .map((v, i) => (
                <VideoTile
                  key={v.id}
                  videoId={v.id}
                  length={mmss(v.duration_seconds)}
                  caption={
                    v.video_questions ? `${i + 1}. ${v.video_questions.prompt}` : t("videoExplains")
                  }
                />
              ))}
          </div>
        ) : null}
      </Section>

      <Section
        icon="checklist"
        title={t("aboutYou")}
        meta={t("answersCount", { count: surveyItems.filter((s) => s.text).length })}
      >
        {surveyItems.length ? (
          <ShowAll count={surveyItems.length}>
            <dl className="m-0 flex flex-col gap-2.5">
              {surveyItems.map(({ q, text }) => (
                <div key={q.id} className="flex flex-col gap-0.5">
                  <dt className="text-[13px] font-medium text-wm-slate">{q.prompt}</dt>
                  <dd className="m-0 text-sm font-bold whitespace-pre-line">{text || "—"}</dd>
                </div>
              ))}
            </dl>
          </ShowAll>
        ) : (
          <p className="m-0 text-[13px] font-medium text-wm-caption">{t("noSurvey")}</p>
        )}
      </Section>

      <DecisionBar applicationId={app.id} status={app.status} notes={app.admin_notes ?? ""} />
    </section>
  );
}
