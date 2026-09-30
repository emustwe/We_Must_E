import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { getCandidateCvUrl } from "@/actions/sponsor-candidates";
import { CvButton } from "@/components/admin/review-panel";
import { Avatar, btn } from "@/components/admin/wm";
import { WmIcon } from "@/components/map/wm-icons";
import { CandidateVideo, CopyButton } from "@/components/sponsors/candidate-media";
import { Crumbs } from "@/components/sponsors/sponsor-shell";
import { UnlockButton } from "@/components/sponsors/unlock-button";
import { getEmployerAccount } from "@/lib/auth/employer";
import { createClient } from "@/lib/supabase/server";
import { RETENTION_DAYS } from "@/lib/legal";
import { candidateCode } from "@/lib/sponsors/candidate-code";
import { idSchema } from "@/lib/validations/jobs";
import { typingResult } from "@/lib/typing";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("candidate");
  return { title: t("title"), robots: { index: false, follow: false } };
}

type Answer = {
  options?: number[];
  other?: string;
  text?: string;
  number?: number;
  stats?: { seconds: number; backspaces: number };
} | null;
type Item = { prompt: string; type: string; options: string[]; answer: Answer };
type Candidate = {
  id: string;
  job_id: string;
  job_title: string;
  unlocked: boolean;
  counted: boolean;
  price: number;
  // Contact details: null until opened.
  full_name: string | null;
  phone: string | null;
  email: string | null;
  approved_at: string;
  submitted_at: string;
  test: Item[];
  survey: Item[];
  video_questions: string[];
  videos: { id: string; seconds: number; prompt: string | null }[];
  profile: Record<string, string | number>;
  has_cv: boolean;
};

function answerText(q: Item) {
  const a = q.answer;
  if (!a) return "—";
  if (Array.isArray(a.options))
    return (
      a.options
        .map((i) =>
          a.other && /^other\b/i.test(q.options[i] ?? "")
            ? `${q.options[i]}: ${a.other}`
            : q.options[i],
        )
        .filter(Boolean)
        .join(", ") || "—"
    );
  // Typing test: what was typed, with speed and accuracy.
  if (q.type === "typing" && typeof a.text === "string" && a.stats) {
    const r = typingResult(q.options[0] ?? "", a.text, a.stats.seconds);
    return `${a.text}\n(${r.wpm} WPM · ${r.accuracy}% · ${a.stats.backspaces} backspaces)`;
  }
  if (typeof a.number === "number") return String(a.number);
  return a.text || "—";
}

// Gender and age are never shared with sponsors; the preferred name only
// once the contact is open.
const PROFILE_ORDER = [
  "preferredName",
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

// A candidate approved by the WemustE team for this sponsor's job: the whole
// application is visible. The contact details (name, phone, email, CV, and
// any contact written in an answer, which the database replaces with •••)
// open with Era and then stay open until the job closes.
export default async function CandidatePage({
  params,
}: PageProps<"/sponsor/jobs/[id]/candidates/[appId]">) {
  const { id, appId } = await params;
  if (!idSchema.safeParse(id).success || !idSchema.safeParse(appId).success) notFound();
  const { employer } = await getEmployerAccount();
  const t = await getTranslations("candidate");
  const ta = await getTranslations("apply");
  const te = await getTranslations("ecoins");
  const tj = await getTranslations("employerJob");
  const tu = await getTranslations("sponsorUi");
  const format = await getFormatter();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("sponsor_get_candidate", {
    p_application_id: appId,
  });
  const c = data as Candidate | null;
  if (error || !c || c.job_id !== id) notFound();
  const label = c.full_name ?? te("candidateLabel", { code: candidateCode(c.id) });
  const length = (s: number) => `0:${String(Math.min(59, Math.round(s))).padStart(2, "0")}`;
  const [first, ...rest] = c.videos;
  const visibleUntil = format.dateTime(
    new Date(new Date(c.submitted_at).getTime() + RETENTION_DAYS * 86_400_000),
    { dateStyle: "medium" },
  );
  const prompt = (v: Candidate["videos"][number], i: number) =>
    v.prompt ??
    (c.videos.length === 1 ? c.video_questions.join("\n") || null : (c.video_questions[i] ?? null));

  return (
    <>
      <Crumbs
        items={[
          { label: tj("back"), href: "/sponsor" },
          { label: c.job_title, href: `/sponsor/jobs/${id}` },
          { label },
        ]}
      />
      <div className="flex flex-col gap-4 xl:flex-row">
        <div className="box-border flex w-full shrink-0 flex-col gap-5 self-start rounded-3xl bg-white p-6 shadow-wm-1 xl:w-[440px]">
          <div className="flex items-center gap-4">
            <Avatar name={label} size={64} />
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.7px] break-words">
                {label}
              </h1>
              <span className="text-[13px] font-medium text-wm-slate">
                {t("approvedOn", {
                  date: format.dateTime(new Date(c.approved_at), { dateStyle: "medium" }),
                })}
              </span>
            </div>
          </div>
          <span className="inline-flex h-8 items-center gap-1.5 self-start rounded-full bg-wm-ok-bg px-3 text-[13px] font-bold text-wm-ok">
            <WmIcon name="shieldCheck" size={15} stroke={2.2} />
            {tu("approvedByWemuste")}
          </span>
          <p className="m-0 flex items-start gap-2 rounded-2xl bg-[#FEF6E4] px-3.5 py-3 text-[13px] font-semibold text-[#7A4B06]">
            <span className="shrink-0">
              <WmIcon name="shieldClock" size={16} stroke={2.2} />
            </span>
            {tu("visibleUntil", { date: visibleUntil })}
          </p>
          {c.unlocked && c.phone ? (
            <OpenContact c={c} t={t} tu={tu} />
          ) : (
            <LockedContact
              c={c}
              balance={employer?.ecoin_balance ?? 0}
              title={te("lockedTitle")}
              body={te("lockedBody")}
              why={c.counted ? te("priceCounted") : te("priceNew", { count: c.price })}
              cv={c.has_cv ? te("hiddenCv") : null}
            />
          )}
          <div className="flex items-start gap-2.5 rounded-2xl bg-wm-land p-3.5 text-xs font-semibold text-wm-slate">
            <span className="shrink-0 text-wm-trust">
              <WmIcon name="shieldCheck" size={16} stroke={2.2} />
            </span>
            {t("privacy")}
          </div>
        </div>

        <div className="flex min-w-0 grow flex-col gap-4">
          {first ? (
            <section className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-wm-1">
              <div className="flex flex-col gap-1">
                <h2 className="m-0 text-lg font-extrabold tracking-[-0.3px]">{t("videos")}</h2>
                <span className="text-[13px] font-medium text-wm-slate">{t("videoNote")}</span>
              </div>
              <CandidateVideo
                videoId={first.id}
                number={1}
                prompt={prompt(first, 0)}
                length={length(first.seconds)}
                large
              />
              {rest.length ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {rest.map((v, i) => (
                    <CandidateVideo
                      key={v.id}
                      videoId={v.id}
                      number={i + 2}
                      prompt={prompt(v, i + 1)}
                      length={length(v.seconds)}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {Object.keys(c.profile ?? {}).length ? (
            <section className="flex flex-col gap-3 rounded-3xl bg-white p-6 shadow-wm-1">
              <h2 className="m-0 text-lg font-extrabold tracking-[-0.3px]">{t("profile")}</h2>
              <dl className="m-0 grid gap-x-6 sm:grid-cols-2">
                {PROFILE_ORDER.filter((k) => c.profile?.[k] !== undefined).map((k) => (
                  <div key={k} className="border-b border-wm-line py-3">
                    <dt className="text-xs font-semibold text-wm-slate">
                      {ta(`profile.${k}` as never)}
                    </dt>
                    <dd className="m-0 mt-0.5 text-sm font-bold whitespace-pre-line">
                      {k === "englishLevel"
                        ? ta(`englishOption.${c.profile[k]}` as never)
                        : String(c.profile[k])}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <AnswerList title={t("testAnswers")} items={c.test} numbered />
          <AnswerList title={t("answers")} items={c.survey} />
        </div>
      </div>
    </>
  );
}

type T = Awaited<ReturnType<typeof getTranslations>>;

// The opened contact: call, WhatsApp, email, copy, CV.
function OpenContact({ c, t, tu }: { c: Candidate; t: T; tu: T }) {
  const phone = c.phone!;
  return (
    <>
      <div className="flex flex-col gap-2.5">
        <span className="text-sm font-extrabold">{tu("contact")}</span>
        <div className="flex flex-wrap gap-2">
          <a href={`tel:${phone}`} className={btn("primary")}>
            <WmIcon name="phone" size={17} stroke={2.2} />
            {t("call")}
          </a>
          <a
            href={`https://wa.me/${phone.replace(/^\+/, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className={btn("secondary")}
          >
            <WmIcon name="external" size={17} stroke={2.2} />
            {t("whatsapp")}
          </a>
          {c.email ? (
            <a href={`mailto:${c.email}`} className={btn("secondary")}>
              <WmIcon name="mail" size={17} stroke={2.2} />
              {t("email")}
            </a>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <ContactRow icon="phone" label={tu("phone")} copy={tu("copyPhone")} value={phone} />
        {c.email ? (
          <ContactRow icon="mail" label={t("email")} copy={tu("copyEmail")} value={c.email} />
        ) : null}
      </div>
      {c.has_cv ? (
        <CvButton applicationId={c.id} load={getCandidateCvUrl} className={btn("secondary")} />
      ) : null}
    </>
  );
}

// The hidden contact: a blurred stand-in (no real data is sent) and the price.
function LockedContact({
  c,
  balance,
  title,
  body,
  why,
  cv,
}: {
  c: Candidate;
  balance: number;
  title: string;
  body: string;
  why: string;
  cv: string | null;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[20px] border border-wm-line p-4">
      <div aria-hidden="true" className="flex flex-col gap-2 blur-[5px] select-none">
        <span className="rounded-2xl bg-wm-land px-3.5 py-2.5 text-sm font-bold">
          +00 000 000 0000
        </span>
        <span className="rounded-2xl bg-wm-land px-3.5 py-2.5 text-sm font-bold">
          name@example.com
        </span>
      </div>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-wm-tint text-wm-blue">
          <WmIcon name="lock" size={18} stroke={2.2} />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="m-0 text-base font-extrabold">{title}</h2>
          <p className="m-0 text-[13px] font-medium text-wm-slate">{body}</p>
          <p className="m-0 text-[13px] font-semibold text-wm-body">{why}</p>
          {cv ? <p className="m-0 text-[13px] font-medium text-wm-caption">{cv}</p> : null}
        </div>
      </div>
      <UnlockButton applicationId={c.id} balance={balance} price={c.price} />
    </div>
  );
}

function ContactRow({
  icon,
  label,
  value,
  copy,
}: {
  icon: "phone" | "mail";
  label: string;
  value: string;
  copy: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-wm-land px-3.5 py-2.5">
      <span className="shrink-0 text-wm-slate">
        <WmIcon name={icon} size={17} stroke={2.1} />
      </span>
      <span className="flex min-w-0 grow flex-col">
        <span className="text-[11px] font-semibold text-wm-slate">{label}</span>
        <span className="text-sm font-bold break-all" dir="ltr">
          {value}
        </span>
      </span>
      <CopyButton value={value} label={copy} />
    </div>
  );
}

function AnswerList({
  title,
  items,
  numbered,
}: {
  title: string;
  items: Item[];
  numbered?: boolean;
}) {
  if (!items.length) return null;
  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-white p-6 shadow-wm-1">
      <h2 className="m-0 text-lg font-extrabold tracking-[-0.3px]">{title}</h2>
      <dl className="m-0 flex flex-col">
        {items.map((q, i) => (
          <div key={i} className="border-b border-wm-line py-3 last:border-0">
            <dt className="text-[13px] font-semibold whitespace-pre-line text-wm-slate">
              {numbered ? `${i + 1}. ` : ""}
              {q.prompt}
            </dt>
            <dd className="m-0 mt-1 text-sm font-bold whitespace-pre-line">{answerText(q)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
