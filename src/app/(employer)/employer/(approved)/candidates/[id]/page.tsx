import { ArrowLeft, Lock, Mail, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Badge, Card } from "@/components/admin/ui";
import { EmployerMeetingCard } from "@/components/meetings/employer-meeting-card";
import { MediaButton } from "@/components/meetings/media-button";
import { MeetingRequestForm } from "@/components/meetings/meeting-request-form";
import type { Slot } from "@/components/meetings/slot-label";
import { buttonVariants } from "@/components/ui/button";
import { loadCandidate } from "@/lib/candidates";
import { idSchema } from "@/lib/validations/jobs";

export const metadata: Metadata = { title: "Candidate" };

const digits = (value: string) => value.replace(/[^\d+]/g, "");

// Each section appears only if RLS returned data for it: admin grant scopes,
// or the candidate's own request to one of this employer's jobs.
export default async function CandidatePage({ params }: PageProps<"/employer/candidates/[id]">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const c = await loadCandidate(id);
  const t = await getTranslations("candidates");
  const ts = await getTranslations("schedule");
  const tr = await getTranslations("requestStatus");
  const openMeeting = c.meetings.some((m) => m.status === "requested");

  return (
    <div className="space-y-5">
      <Link
        href="/employer/candidates"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        {t("back")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {c.name || c.profile.headline || t("anonymous")}
          </h1>
          {c.name ? (
            <p className="text-muted-foreground">{c.profile.headline}</p>
          ) : (
            <p className="text-sm text-muted-foreground">{t("nameHidden")}</p>
          )}
        </div>
        {!openMeeting ? <MeetingRequestForm employeeId={c.id} /> : null}
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="size-3.5" aria-hidden="true" />
        {t("privacyNote")}
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-bold">{t("profile")}</h2>
          <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="text-muted-foreground">📍</dt>
            <dd>{c.profile.city_emirate ?? "—"}</dd>
            <dt className="text-muted-foreground">{t("languages")}</dt>
            <dd>{c.profile.languages.join(", ") || "—"}</dd>
            <dt className="text-muted-foreground">{t("skills")}</dt>
            <dd>{c.profile.skills.join(", ") || "—"}</dd>
            <dt className="text-muted-foreground">{t("availability")}</dt>
            <dd>{c.profile.availability.map((a) => ts(a)).join(", ") || "—"}</dd>
            <dt className="text-muted-foreground">{t("pay")}</dt>
            <dd>{c.profile.expected_pay_range ?? "—"}</dd>
          </dl>
        </Card>

        {c.contact ? (
          <Card>
            <h2 className="mb-3 font-bold">{t("contact")}</h2>
            <div className="flex flex-wrap gap-2">
              {c.contact.phone ? (
                <a
                  href={`tel:${digits(c.contact.phone)}`}
                  className={buttonVariants({ size: "pill" })}
                >
                  <Phone className="size-4" aria-hidden="true" />
                  {t("call")}
                </a>
              ) : null}
              {c.contact.whatsapp ? (
                <a
                  href={`https://wa.me/${digits(c.contact.whatsapp).replace("+", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ size: "pill", variant: "secondary" })}
                >
                  <MessageCircle className="size-4" aria-hidden="true" />
                  {t("whatsapp")}
                </a>
              ) : null}
              {c.contact.email ? (
                <a
                  href={`mailto:${c.contact.email}`}
                  className={buttonVariants({ size: "pill", variant: "outline" })}
                >
                  <Mail className="size-4" aria-hidden="true" />
                  {c.contact.email}
                </a>
              ) : null}
            </div>
          </Card>
        ) : null}

        {c.test ? (
          <Card>
            <h2 className="mb-2 font-bold">{t("test")}</h2>
            <p className="text-2xl font-extrabold">{Math.round(Number(c.test.score ?? 0))}%</p>
            <p className="text-sm text-muted-foreground">
              {c.test.tests?.title} ·{" "}
              {t("testScore", {
                score: Math.round(Number(c.test.score ?? 0)),
                pass: Number(c.test.tests?.pass_score ?? 0),
              })}
            </p>
          </Card>
        ) : null}

        {c.cv ? (
          <Card>
            <h2 className="mb-3 font-bold">{t("cv")}</h2>
            <MediaButton
              employeeId={c.id}
              kind="cv"
              id={c.cv.id}
              label={`${t("openCv")} · ${Math.round(c.cv.size_bytes / 1024)} KB`}
            />
            <p className="mt-2 text-xs text-muted-foreground">{t("linkNote")}</p>
          </Card>
        ) : null}
      </div>

      {c.videos.length ? (
        <Card>
          <h2 className="mb-3 font-bold">{t("videos")}</h2>
          <ul className="grid gap-4 md:grid-cols-2">
            {c.videos.map((v) => (
              <li key={v.id} className="space-y-2">
                <p className="text-sm font-semibold">{v.video_prompts?.prompt}</p>
                <MediaButton employeeId={c.id} kind="video" id={v.id} label={t("play")} />
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">{t("linkNote")}</p>
        </Card>
      ) : null}

      {c.survey.length ? (
        <Card>
          <h2 className="mb-3 font-bold">{t("survey")}</h2>
          <dl className="space-y-2">
            {c.survey.map((a, i) => (
              <div key={i} className="rounded-2xl bg-muted/60 p-3 text-sm">
                <dt className="font-semibold">{a.prompt}</dt>
                <dd className="mt-0.5 text-muted-foreground">
                  {Array.isArray(a.answer) ? a.answer.join(", ") : String(a.answer)}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      ) : null}

      {c.applications.length ? (
        <Card>
          <h2 className="mb-3 font-bold">{t("yourJobs")}</h2>
          <ul className="flex flex-wrap gap-2">
            {c.applications.map((a) => (
              <li key={a.id}>
                <Badge>
                  {a.jobs?.title} · {tr(a.status)}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {c.meetings.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {c.meetings.map((m) => (
            <EmployerMeetingCard
              key={m.id}
              meeting={{
                id: m.id,
                status: m.status,
                slots: m.proposed_slots as Slot[],
                chosen: m.chosen_slot,
                link: m.meeting_link,
                employeeId: c.id,
                who: c.name || c.profile.headline || t("anonymous"),
              }}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
