"use client";

import { ChevronDown, ClipboardList, SearchX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { getJobDetail, type JobDetail } from "@/actions/jobs";
import { JobCard, type JobSummary } from "@/components/jobs/job-card";
import { JobSheet } from "@/components/jobs/job-sheet";
import { JobMap } from "@/components/map/job-map";
import {
  CATEGORY_META,
  CITIES,
  JOB_CATEGORIES,
  type CityId,
  type JobCategory,
} from "@/lib/jobs/meta";
import { cn } from "@/lib/utils";

// Employee home: full-screen map with emoji pins, filters on top, cards at
// the bottom (a list panel on desktop), and a detail sheet.
export function JobExplorer({ jobs, profileReady }: { jobs: JobSummary[]; profileReady: boolean }) {
  const t = useTranslations("map");
  const to = useTranslations("onboarding");
  const tc = useTranslations("categories");
  const te = useTranslations("errors");
  const router = useRouter();
  const [city, setCity] = useState<CityId>("Dubai");
  const [category, setCategory] = useState<JobCategory | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, startLoading] = useTransition();
  const [, startRefresh] = useTransition();
  const cardRefs = useRef(new Map<string, HTMLDivElement>());

  const cityMeta = CITIES.find((c) => c.id === city) ?? CITIES[0];
  const visible = useMemo(
    () => jobs.filter((job) => job.city === city && (!category || job.category === category)),
    [jobs, city, category],
  );
  const categoriesHere = useMemo(
    () => JOB_CATEGORIES.filter((c) => jobs.some((job) => job.city === city && job.category === c)),
    [jobs, city],
  );

  function loadDetail(id: string) {
    startLoading(async () => {
      const result = await getJobDetail(id);
      if (result.ok) setDetail(result.data);
      else {
        setDetail(null);
        setSheetOpen(false);
        toast.error(te(result.error));
      }
    });
  }

  function open(id: string) {
    setSelectedId(id);
    setSheetOpen(true);
    setDetail((current) => (current?.id === id ? current : null));
    loadDetail(id);
  }

  // Keep the matching card in view when a pin is tapped.
  useEffect(() => {
    if (!selectedId) return;
    cardRefs.current
      .get(selectedId)
      ?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selectedId]);

  return (
    <div className="fixed inset-0 bottom-16 sm:bottom-0">
      <JobMap
        className="absolute inset-0"
        center={cityMeta.center as [number, number]}
        zoom={cityMeta.zoom}
        pins={visible.map((job) => ({
          id: job.id,
          lat: job.lat,
          lng: job.lng,
          category: job.category,
          payMin: job.payMin,
          requested: job.requestStatus === "pending" || job.requestStatus === "accepted",
        }))}
        selectedId={selectedId}
        onSelect={open}
        padding={{ bottom: 220, left: 0 }}
        fitKey={`${city}:${category ?? "all"}`}
        fitPadding={(desktop) =>
          desktop
            ? { top: 140, bottom: 110, left: 440, right: 60 }
            : { top: 130, bottom: 190, left: 40, right: 40 }
        }
      />

      {/* Filters */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 space-y-2.5 px-3 pt-3 lg:start-[25rem] lg:px-4 lg:pt-4">
        <div className="pointer-events-auto flex items-center gap-2">
          <label className="shadow-float relative inline-flex h-11 items-center rounded-full bg-background ps-4 pe-9 text-sm font-bold">
            <span className="sr-only">{t("chooseCity")}</span>
            <span aria-hidden="true" className="me-1.5">
              📍
            </span>
            <select
              value={city}
              onChange={(e) => {
                setCity(e.target.value as CityId);
                setCategory(null);
                setSelectedId(null);
              }}
              className="appearance-none bg-transparent font-bold outline-none"
            >
              {CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute end-3 size-4" aria-hidden="true" />
          </label>
          <span
            className="shadow-float inline-flex h-11 items-center rounded-full bg-background px-4 text-sm font-semibold"
            aria-live="polite"
          >
            {t("jobsCount", { count: visible.length })}
          </span>
        </div>
        {!profileReady ? (
          <Link
            href="/employee/onboarding"
            className="shadow-float pointer-events-auto flex items-center gap-3 rounded-2xl bg-primary p-3 text-primary-foreground lg:max-w-md"
          >
            <ClipboardList className="size-5 shrink-0" aria-hidden="true" />
            <span className="flex-1 text-sm leading-snug font-semibold">{to("startBanner")}</span>
            <span className="rounded-full bg-primary-foreground px-3 py-1.5 text-xs font-bold text-primary">
              {to("startCta")}
            </span>
          </Link>
        ) : null}
        {categoriesHere.length > 1 ? (
          <div className="pointer-events-auto -mx-3 flex scrollbar-none gap-2 overflow-x-auto px-3 pb-1">
            <Chip active={!category} onClick={() => setCategory(null)}>
              {t("allJobs")}
            </Chip>
            {categoriesHere.map((c) => (
              <Chip
                key={c}
                active={category === c}
                onClick={() => setCategory(category === c ? null : c)}
              >
                <span aria-hidden="true">{CATEGORY_META[c].emoji}</span> {tc(c)}
              </Chip>
            ))}
          </div>
        ) : null}
      </div>

      {/* Desktop list panel */}
      <aside className="shadow-float absolute inset-y-4 start-4 z-20 hidden w-[23rem] flex-col overflow-hidden rounded-[2rem] bg-background lg:flex">
        <h1 className="px-5 pt-5 pb-3 text-xl font-extrabold tracking-tight">{t("listTitle")}</h1>
        <div className="flex-1 space-y-2.5 overflow-y-auto px-3 pb-24">
          {visible.length ? (
            visible.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                selected={job.id === selectedId}
                onSelect={open}
                className="bg-muted/50 shadow-none"
              />
            ))
          ) : (
            <EmptyState title={t("emptyTitle")} body={t("emptyBody")} />
          )}
        </div>
      </aside>

      {/* Mobile card carousel */}
      {!sheetOpen ? (
        <div className="absolute inset-x-0 bottom-3 z-20 lg:hidden">
          {visible.length ? (
            <div className="flex snap-x snap-mandatory scrollbar-none gap-3 overflow-x-auto px-4 pb-1">
              {visible.map((job) => (
                <div
                  key={job.id}
                  ref={(el) => {
                    if (el) cardRefs.current.set(job.id, el);
                    else cardRefs.current.delete(job.id);
                  }}
                  className="w-[86%] shrink-0 snap-center sm:w-80"
                >
                  <JobCard job={job} selected={job.id === selectedId} onSelect={open} />
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4">
              <div className="shadow-float rounded-3xl bg-background p-4">
                <EmptyState title={t("emptyTitle")} body={t("emptyBody")} />
              </div>
            </div>
          )}
        </div>
      ) : null}

      {sheetOpen ? (
        <JobSheet
          job={detail}
          loading={loading && !detail}
          profileReady={profileReady}
          onClose={() => setSheetOpen(false)}
          onChanged={() => {
            if (selectedId) loadDetail(selectedId);
            startRefresh(() => router.refresh());
          }}
        />
      ) : null}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shadow-float inline-flex h-10 shrink-0 items-center gap-1 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors",
        active ? "bg-foreground text-background" : "bg-background text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <SearchX className="size-7 text-muted-foreground" aria-hidden="true" />
      <p className="font-bold">{title}</p>
      <p className="max-w-xs text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
