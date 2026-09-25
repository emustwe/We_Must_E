"use client";

import {
  BadgeCheck,
  Banknote,
  ChevronDown,
  List,
  LocateFixed,
  Lock,
  Map as MapIcon,
  MapPin,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MapTarget } from "@/components/explore/explore-map";
import { PlaceSearch } from "@/components/map/place-search";
import { Logo } from "@/components/brand/logo";
import { SponsorLogo } from "@/components/sponsors/sponsor-logo";
import { buttonVariants } from "@/components/ui/button";
import { COUNTRIES, countryName, normaliseCity } from "@/lib/geo/countries";
import { distanceKm, type Bounds } from "@/lib/jobs/meta";
import { findCountry } from "@/lib/map/geocode";
import { useLiveJobs } from "@/components/explore/use-live-jobs";
import { placeLine, type PublicJob } from "@/lib/jobs/public-job";
import { cn } from "@/lib/utils";

const ExploreMap = dynamic(() => import("@/components/explore/explore-map"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden="true" />,
});

const DISTANCES = [null, 2, 5, 10, 25] as const;
type Distance = (typeof DISTANCES)[number];
type Origin = { point: [number, number]; kind: "me" | "place"; label: string };
type LocState = "checking" | "prompt" | "locating" | "denied" | "done";

const PROMPT_KEY = "wm-location-prompt";

// The area around some jobs, to fit the map to them.
function boundsOf(jobs: PublicJob[]): MapTarget | null {
  if (!jobs.length) return null;
  if (jobs.length === 1) return { center: [jobs[0].lat, jobs[0].lng], zoom: 13 };
  const lats = jobs.map((j) => j.lat);
  const lngs = jobs.map((j) => j.lng);
  return {
    bounds: [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ],
  };
}

function readDismissed() {
  try {
    return sessionStorage.getItem(PROMPT_KEY) === "dismissed";
  } catch {
    return false;
  }
}

export function TrustLines({ className }: { className?: string }) {
  const t = useTranslations("explore");
  const lines = [
    { icon: BadgeCheck, text: t("trustFree") },
    { icon: Banknote, text: t("trustMoney") },
    { icon: Lock, text: t("trustPrivate") },
  ];
  return (
    <ul className={cn("space-y-1.5 text-sm", className)}>
      {lines.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-2">
          <Icon className="size-4 shrink-0 text-success" aria-hidden="true" />
          {text}
        </li>
      ))}
    </ul>
  );
}

export function JobExplorer({
  jobs: initialJobs,
  bounds,
  initialJobId,
}: {
  jobs: PublicJob[];
  bounds: Bounds;
  initialJobId: string | null;
}) {
  const t = useTranslations("explore");
  // Live: approved jobs appear (and closed ones disappear) without a reload.
  const jobs = useLiveJobs(initialJobs, bounds);
  const format = useFormatter();
  const [selectedId, setSelectedId] = useState<string | null>(
    initialJobId && jobs.some((j) => j.id === initialJobId) ? initialJobId : null,
  );
  const [view, setView] = useState<"map" | "list">("map");
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [distance, setDistance] = useState<Distance>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  // A searched city also matches jobs within 25 km of its centre.
  const [cityCenter, setCityCenter] = useState<[number, number] | null>(null);
  const [cityPanel, setCityPanel] = useState(false);
  const [target, setTarget] = useState<MapTarget | null>(() => {
    const job = jobs.find((j) => j.id === initialJobId);
    return job ? { center: [job.lat, job.lng], zoom: 14 } : boundsOf(jobs);
  });
  const [locState, setLocState] = useState<LocState>("checking");
  const sheetHeading = useRef<HTMLHeadingElement>(null);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLocState("denied");
      return;
    }
    setLocState("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setOrigin({ point, kind: "me", label: t("nearYou") });
        setTarget({ center: point, zoom: 13 });
        setLocState("done");
      },
      () => setLocState("denied"),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }, [t]);

  // Ask for location only if the browser already allows it; otherwise offer
  // a prompt (with a country fallback) instead of a cold permission dialog.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await navigator.permissions?.query({ name: "geolocation" });
        if (cancelled) return;
        if (status?.state === "granted" && !initialJobId) return locate();
        if (status?.state === "denied") return setLocState("denied");
      } catch {
        // Permissions API missing (older Safari): fall through to the prompt.
      }
      if (!cancelled) setLocState(readDismissed() ? "done" : "prompt");
    })();
    return () => {
      cancelled = true;
    };
  }, [locate, initialJobId]);

  function dismissPrompt() {
    try {
      sessionStorage.setItem(PROMPT_KEY, "dismissed");
    } catch {
      // Storage blocked: the prompt just shows again next visit.
    }
    setLocState("done");
  }

  // Countries that have jobs come first in the pickers.
  const jobCountries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const j of jobs)
      if (j.countryCode) counts.set(j.countryCode, (counts.get(j.countryCode) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([code, count]) => ({ code, name: countryName(code), count }));
  }, [jobs]);

  const cities = useMemo(() => {
    if (!country) return [];
    const counts = new Map<string, number>();
    for (const j of jobs) {
      if (j.countryCode === country && j.city) counts.set(j.city, (counts.get(j.city) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], "en"));
  }, [jobs, country]);

  async function chooseCountry(code: string | null) {
    setCountry(code);
    setCity(null);
    setCityCenter(null);
    setLocState("done");
    if (!code) {
      setTarget(boundsOf(jobs));
      return;
    }
    const inCountry = jobs.filter((j) => j.countryCode === code);
    const fit = boundsOf(inCountry);
    if (fit) {
      setTarget(fit);
      return;
    }
    // No jobs there yet: still show the country.
    const place = await findCountry(countryName(code), code).catch(() => null);
    if (place?.bbox) {
      const [w, s, e, n] = place.bbox;
      setTarget({
        bounds: [
          [s, w],
          [n, e],
        ],
      });
    } else if (place) {
      setTarget({ center: [place.lat, place.lng], zoom: 5 });
    }
  }

  function chooseCity(name: string | null, center: [number, number] | null = null) {
    setCity(name);
    setCityCenter(center);
    setCityPanel(false);
    if (center) {
      setTarget({ center, zoom: 11 });
      return;
    }
    const inArea = jobs.filter((j) => j.countryCode === country && (!name || j.city === name));
    const fit = boundsOf(inArea);
    if (fit) setTarget(fit);
  }

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    // Keep the open job in the URL so it can be shared and survives Back.
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("job", id);
    else url.searchParams.delete("job");
    window.history.replaceState(null, "", url);
  }, []);

  const withDistance = useMemo(
    () =>
      jobs.map((job) => ({
        job,
        km: origin ? distanceKm(origin.point, [job.lat, job.lng]) : null,
      })),
    [jobs, origin],
  );
  const visible = useMemo(() => {
    const list = withDistance.filter(
      ({ job, km }) =>
        (!country || job.countryCode === country) &&
        (!city ||
          job.city?.toLowerCase() === city.toLowerCase() ||
          (cityCenter !== null && distanceKm(cityCenter, [job.lat, job.lng]) <= 25)) &&
        (!distance || !origin || (km ?? 0) <= distance),
    );
    return origin ? [...list].sort((a, b) => (a.km ?? 0) - (b.km ?? 0)) : list;
  }, [withDistance, distance, origin, country, city, cityCenter]);
  const areaLabel = city ?? (country ? countryName(country) : null);

  const selected = selectedId ? withDistance.find((j) => j.job.id === selectedId) : undefined;

  useEffect(() => {
    if (!selectedId) return;
    sheetHeading.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && select(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, select]);

  const km = (value: number | null) =>
    value === null
      ? null
      : t("distance", {
          km: format.number(value, { maximumFractionDigits: value < 10 ? 1 : 0 }),
        });

  return (
    <div className="relative h-dvh overflow-hidden bg-muted">
      <h1 className="sr-only">{t("pageTitle")}</h1>
      <ExploreMap
        jobs={visible.map((v) => v.job)}
        bounds={bounds}
        selectedId={selectedId}
        onSelect={select}
        target={target}
        me={origin?.kind === "me" ? origin.point : null}
        label={t("mapLabel")}
      />

      {/* Top bar: logo, search, filters */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] space-y-2 p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <Link
            href="/for-sponsors"
            aria-label={t("aboutWemuste")}
            className="shadow-float pointer-events-auto hidden shrink-0 rounded-full bg-background py-1.5 ps-1.5 pe-4 sm:block"
          >
            <Logo />
          </Link>
          <PlaceSearch
            bounds={bounds}
            country={country}
            placeholder={t("searchPlaceholder")}
            className="shadow-float pointer-events-auto min-w-0 flex-1 rounded-full sm:max-w-md"
            inputClassName="border-transparent"
            onPick={(place) => {
              setOrigin({ point: [place.lat, place.lng], kind: "place", label: place.label });
              setTarget({ center: [place.lat, place.lng], zoom: 14 });
              setLocState("done");
            }}
          />
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "outline", size: "pill" }),
              "shadow-float pointer-events-auto ms-auto shrink-0 border-transparent",
            )}
          >
            {t("employerLogin")}
          </Link>
        </div>

        <div className="pointer-events-auto flex [scrollbar-width:none] gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={locate}
            aria-label={t("useLocation")}
            className={cn(
              "shadow-float flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold",
              origin?.kind === "me" ? "bg-primary text-primary-foreground" : "bg-background",
            )}
          >
            <LocateFixed
              className={cn("size-4", locState === "locating" && "animate-pulse")}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">{t("nearMe")}</span>
          </button>
          <label className="sr-only" htmlFor="wm-country">
            {t("country")}
          </label>
          <select
            id="wm-country"
            value={country ?? ""}
            onChange={(e) => void chooseCountry(e.target.value || null)}
            className={cn(
              "shadow-float h-10 max-w-44 shrink-0 rounded-full border-0 ps-3.5 pe-8 text-sm font-semibold",
              country ? "bg-primary text-primary-foreground" : "bg-background",
            )}
          >
            <option value="">{t("allCountries")}</option>
            {jobCountries.length ? (
              <optgroup label={t("countriesWithJobs")}>
                {jobCountries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.count})
                  </option>
                ))}
              </optgroup>
            ) : null}
            <optgroup label={t("allCountriesGroup")}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          </select>
          {country ? (
            <button
              type="button"
              onClick={() => setCityPanel((v) => !v)}
              aria-expanded={cityPanel}
              aria-controls="wm-city-panel"
              className={cn(
                "shadow-float flex h-10 max-w-44 shrink-0 items-center gap-1 rounded-full ps-3.5 pe-3 text-sm font-semibold",
                city ? "bg-primary text-primary-foreground" : "bg-background",
              )}
            >
              <span className="truncate">{city ?? t("allCities")}</span>
              <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
              <span className="sr-only"> ({t("city")})</span>
            </button>
          ) : null}
          <div
            role="group"
            aria-label={t("distanceLabel")}
            className="shadow-float flex h-10 shrink-0 items-center gap-0.5 rounded-full bg-background p-1"
          >
            {DISTANCES.map((d) => (
              <button
                key={d ?? "any"}
                type="button"
                aria-pressed={distance === d}
                disabled={d !== null && !origin}
                title={d !== null && !origin ? t("distanceNeedsPlace") : undefined}
                onClick={() => setDistance(d)}
                className={cn(
                  "h-8 rounded-full px-3 text-sm font-semibold transition-colors disabled:opacity-40",
                  distance === d ? "bg-foreground text-background" : "hover:bg-muted",
                )}
              >
                {d === null ? t("anyDistance") : t("withinKm", { km: d })}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* City picker: any city in the chosen country (search), or one with jobs */}
      {cityPanel && country ? (
        <section
          id="wm-city-panel"
          aria-labelledby="wm-city-title"
          className="shadow-float animate-in-fast absolute inset-x-3 top-32 z-[1002] max-h-[70dvh] overflow-y-auto rounded-[1.75rem] bg-background p-4 sm:start-4 sm:end-auto sm:w-96"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 id="wm-city-title" className="text-lg font-extrabold">
              {t("cityIn", { country: countryName(country) })}
            </h2>
            <button
              type="button"
              onClick={() => setCityPanel(false)}
              className="flex size-9 items-center justify-center rounded-full hover:bg-muted"
              aria-label={t("closeCities")}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <PlaceSearch
            bounds={bounds}
            country={country}
            kind="city"
            autoFocus
            placeholder={t("searchCity")}
            className="mt-3"
            onPick={(place) =>
              chooseCity(normaliseCity(place.label.split(",")[0] ?? place.label), [
                place.lat,
                place.lng,
              ])
            }
          />
          <ul className="mt-3 space-y-1">
            <li>
              <button
                type="button"
                onClick={() => chooseCity(null)}
                className={cn(
                  "flex h-11 w-full items-center rounded-2xl px-3 text-start text-sm font-semibold hover:bg-muted",
                  !city && "bg-muted",
                )}
              >
                {t("allCities")}
              </button>
            </li>
            {cities.map(([name, count]) => (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => chooseCity(name)}
                  className={cn(
                    "flex h-11 w-full items-center justify-between rounded-2xl px-3 text-start text-sm font-semibold hover:bg-muted",
                    city === name && "bg-muted",
                  )}
                >
                  <span>{name}</span>
                  <span className="text-muted-foreground">{t("jobsCount", { count })}</span>
                </button>
              </li>
            ))}
          </ul>
          {!cities.length ? (
            <p className="mt-2 text-sm text-muted-foreground">{t("noCitiesYet")}</p>
          ) : null}
        </section>
      ) : null}

      {/* Location prompt with a country fallback */}
      {(locState === "prompt" || locState === "denied") && !selected && view === "map" ? (
        <section
          aria-labelledby="wm-loc-title"
          className="shadow-float absolute inset-x-3 bottom-20 z-[1000] rounded-[1.75rem] bg-background p-5 sm:start-4 sm:end-auto sm:bottom-6 sm:w-96"
        >
          <button
            type="button"
            onClick={dismissPrompt}
            className="absolute end-3 top-3 flex size-9 items-center justify-center rounded-full hover:bg-muted"
            aria-label={t("notNow")}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
          <h2 id="wm-loc-title" className="pe-8 text-lg font-extrabold">
            {locState === "denied" ? t("pickEmirateTitle") : t("promptTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {locState === "denied" ? t("pickEmirateBody") : t("promptBody")}
          </p>
          {locState === "prompt" ? (
            <button
              type="button"
              onClick={locate}
              className={cn(buttonVariants({ size: "touch" }), "mt-4 w-full")}
            >
              <LocateFixed className="size-4" aria-hidden="true" />
              {t("useLocation")}
            </button>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {jobCountries.slice(0, 6).map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => void chooseCountry(c.code)}
                className="h-9 rounded-full bg-muted px-3.5 text-sm font-semibold hover:bg-muted/70"
              >
                {c.name}
              </button>
            ))}
          </div>
          <label className="mt-3 block text-sm font-medium" htmlFor="wm-prompt-country">
            {t("orChooseCountry")}
          </label>
          <select
            id="wm-prompt-country"
            value=""
            onChange={(e) => e.target.value && void chooseCountry(e.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
          >
            <option value="">{t("allCountries")}</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </section>
      ) : null}

      {/* Count + list toggle */}
      {!selected ? (
        <div className="absolute inset-x-0 bottom-4 z-[1000] flex justify-center">
          <button
            type="button"
            onClick={() => setView(view === "map" ? "list" : "map")}
            className="shadow-float flex h-12 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-bold text-background"
          >
            {view === "map" ? (
              <List className="size-4" aria-hidden="true" />
            ) : (
              <MapIcon className="size-4" aria-hidden="true" />
            )}
            {view === "map" ? t("showList", { count: visible.length }) : t("showMap")}
          </button>
        </div>
      ) : null}

      {/* List view */}
      {view === "list" && !selected ? (
        <section
          aria-label={t("listTitle")}
          className="absolute inset-x-0 top-32 bottom-0 z-[999] overflow-y-auto rounded-t-[2rem] bg-background px-4 pt-5 pb-24 sm:inset-x-auto sm:start-4 sm:bottom-4 sm:w-[26rem] sm:rounded-[2rem]"
        >
          <h2 className="text-lg font-extrabold">
            {areaLabel
              ? t("listIn", { place: areaLabel })
              : origin
                ? t("listNear", { place: origin.label })
                : t("listTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("jobsCount", { count: visible.length })}
          </p>
          {visible.length === 0 ? (
            <div className="mt-6 rounded-3xl border-2 border-dashed p-8 text-center">
              <p className="font-bold">{t("emptyTitle")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("emptyBody")}</p>
            </div>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {visible.map(({ job, km: dist }) => (
                <li key={job.id}>
                  <button
                    type="button"
                    onClick={() => {
                      select(job.id);
                      setTarget({ center: [job.lat, job.lng], zoom: 15 });
                    }}
                    className="flex w-full items-start gap-3 rounded-3xl bg-muted/60 p-4 text-start hover:bg-muted"
                  >
                    <SponsorLogo
                      name={job.sponsorName}
                      path={job.sponsorLogo}
                      className="size-11 text-sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{job.title}</span>
                      <span className="block truncate text-sm font-medium">{job.sponsorName}</span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {placeLine(job, false)}
                        {dist !== null ? ` · ${km(dist)}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <TrustLines className="mt-6 text-muted-foreground" />
          <nav className="mt-4 flex gap-5 text-xs text-muted-foreground">
            <Link href="/for-sponsors" className="hover:text-foreground">
              {t("forEmployers")}
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              {t("privacy")}
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              {t("terms")}
            </Link>
          </nav>
        </section>
      ) : null}

      {/* Job sheet */}
      {selected ? (
        <section
          aria-labelledby="wm-job-title"
          className="shadow-float animate-in-fast absolute inset-x-0 bottom-0 z-[1001] max-h-[80dvh] overflow-y-auto rounded-t-[2rem] bg-background px-5 pt-3 pb-6 sm:start-4 sm:end-auto sm:bottom-4 sm:w-[26rem] sm:rounded-[2rem] sm:pt-5"
        >
          <div
            className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border sm:hidden"
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={() => select(null)}
            className="absolute end-3 top-3 flex size-10 items-center justify-center rounded-full bg-muted hover:bg-muted/70"
            aria-label={t("closeJob")}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-3 pe-12">
            <SponsorLogo
              name={selected.job.sponsorName}
              path={selected.job.sponsorLogo}
              className="size-14 text-lg"
            />
            <div className="min-w-0">
              <h2
                id="wm-job-title"
                ref={sheetHeading}
                tabIndex={-1}
                className="text-2xl leading-tight font-extrabold tracking-tight break-words outline-none"
              >
                {selected.job.title}
              </h2>
              <p className="truncate text-sm font-semibold text-muted-foreground">
                {selected.job.sponsorName}
              </p>
            </div>
          </div>
          <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              {placeLine(selected.job)}
              {selected.km !== null ? ` · ${km(selected.km)}` : ""}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("posted", {
              date: format.dateTime(new Date(selected.job.publishedAt), {
                day: "numeric",
                month: "short",
              }),
            })}{" "}
            · {t("approxPin")}
          </p>
          <p className="mt-4 text-base leading-relaxed whitespace-pre-line">
            {selected.job.description}
          </p>
          <Link
            href={`/apply/${selected.job.id}`}
            className={cn(buttonVariants({ size: "touch" }), "mt-5 w-full")}
          >
            {t("apply")}
          </Link>
          <p className="mt-2 text-center text-xs text-muted-foreground">{t("applySteps")}</p>
          <TrustLines className="mt-4 rounded-2xl bg-muted/60 p-4" />
        </section>
      ) : null}
    </div>
  );
}
