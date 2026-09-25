"use client";

import type L from "leaflet";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { toast } from "sonner";
import type { MapJob, MapTarget } from "@/components/explore/explore-map";
import { JobCard, JobSheet, type Pager } from "@/components/explore/job-card";
import { useLiveJobs } from "@/components/explore/use-live-jobs";
import { PlaceSearch, type PlaceSearchHandle } from "@/components/map/place-search";
import { WmIcon } from "@/components/map/wm-icons";
import { displayTitle, isNewJob, shortLabel } from "@/lib/jobs/display";
import { distanceKm, isInside, type Bounds } from "@/lib/jobs/meta";
import type { PublicJob } from "@/lib/jobs/public-job";
import { cn } from "@/lib/utils";

const ExploreMap = dynamic(() => import("@/components/explore/explore-map"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-wm-land" aria-hidden="true" />,
});

const DISTANCES = [null, 2, 5, 10, 25] as const;
type Distance = (typeof DISTANCES)[number];
type Origin = { point: [number, number]; kind: "me" | "place" };

const SAVED_KEY = "wm-saved-jobs";
const CARD_W = 392;
// Gap between the pin point and the card: clears the pin's label pill.
const CARD_GAP = 100;

// Phones get the bottom sheet and the compact top bar (reference/mobile-map.html).
const MOBILE = "(max-width: 639px)";
function subscribeMobile(fn: () => void) {
  const mq = window.matchMedia(MOBILE);
  mq.addEventListener("change", fn);
  return () => mq.removeEventListener("change", fn);
}

function boundsOf(jobs: { lat: number; lng: number }[]): MapTarget | null {
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

function readSaved(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

const floating = "bg-white shadow-wm-2";

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
  const mobile = useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia(MOBILE).matches,
    () => false,
  );

  const [map, setMap] = useState<L.Map | null>(null);
  const [view, setView] = useState<Bounds | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialJobId && initialJobs.some((j) => j.id === initialJobId) ? initialJobId : null,
  );
  const [spotIds, setSpotIds] = useState<string[] | null>(null);
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [distance, setDistance] = useState<Distance>(null);
  const [distanceOpen, setDistanceOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [moveSearch, setMoveSearch] = useState(true);
  const [variant, setVariant] = useState<"light" | "satellite">("light");
  const [saved, setSaved] = useState<string[]>([]);
  const [anchor, setAnchor] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [target, setTarget] = useState<MapTarget | null>(() => {
    const job = initialJobs.find((j) => j.id === initialJobId);
    return job ? { center: [job.lat, job.lng], zoom: 14 } : boundsOf(initialJobs);
  });
  const heading = useRef<HTMLHeadingElement>(null);
  const search = useRef<PlaceSearchHandle>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setSaved(readSaved()), 0);
    return () => window.clearTimeout(id);
  }, []);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      toast(t("locationOff"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setOrigin({ point, kind: "me" });
        setTarget({ center: point, zoom: 13 });
        setLocating(false);
      },
      () => {
        setLocating(false);
        toast(t("locationOff"));
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }, [t]);

  // Use the location straight away only if the browser already allows it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await navigator.permissions?.query({ name: "geolocation" });
        if (!cancelled && status?.state === "granted" && !initialJobId) locate();
      } catch {
        // Permissions API missing (older Safari): wait for "Near me".
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locate, initialJobId]);

  const select = useCallback((id: string | null, spot: string[] | null = null) => {
    setSelectedId(id);
    setSpotIds(id ? spot : null);
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
  const filtered = useMemo(
    () => withDistance.filter(({ km }) => !distance || km === null || km <= distance),
    [withDistance, distance],
  );
  const mapJobs: MapJob[] = useMemo(
    () =>
      filtered.map(({ job }) => ({
        id: job.id,
        lat: job.lat,
        lng: job.lng,
        title: displayTitle(job.title),
        label: shortLabel(job.title),
        isNew: isNewJob(job.publishedAt),
      })),
    [filtered],
  );
  // "N jobs in this area": what the map shows, or everything that matches.
  const count =
    moveSearch && view
      ? filtered.filter(({ job }) => isInside(view, job.lat, job.lng)).length
      : filtered.length;

  const selected = selectedId ? withDistance.find((j) => j.job.id === selectedId) : undefined;

  // Esc closes the card; focus moves to its title when it opens.
  useEffect(() => {
    if (!selectedId) return;
    heading.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && select(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, select]);

  // Desktop: keep the card beside its pin while the map moves.
  const lat = selected?.job.lat;
  const lng = selected?.job.lng;
  useEffect(() => {
    if (!map || lat === undefined || lng === undefined || mobile) return;
    const update = () => {
      const p = map.latLngToContainerPoint([lat, lng]);
      const size = map.getSize();
      setAnchor({ x: p.x, y: p.y, w: size.x, h: size.y });
    };
    // Pan so the whole card fits when it would not.
    const p = map.latLngToContainerPoint([lat, lng]);
    const size = map.getSize();
    const fits =
      (p.x + CARD_GAP + CARD_W <= size.x - 24 || p.x - CARD_GAP - CARD_W >= 24) &&
      p.y >= 170 &&
      p.y <= size.y - 80;
    if (!fits) {
      const x = Math.min(Math.max(p.x, 120), size.x - 24 - CARD_W - CARD_GAP);
      const y = Math.min(Math.max(p.y, 220), size.y - 140);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      map.panBy([p.x - x, p.y - y], { animate: !reduce, duration: 0.3 });
    }
    update();
    map.on("move zoom viewreset resize", update);
    return () => {
      map.off("move zoom viewreset resize", update);
    };
  }, [map, lat, lng, mobile]);

  const cardStyle: CSSProperties | null = anchor
    ? (() => {
        const right = anchor.x + CARD_GAP + CARD_W <= anchor.w - 24;
        const left = right ? anchor.x + CARD_GAP : Math.max(24, anchor.x - CARD_GAP - CARD_W);
        const top = Math.max(156, Math.min(anchor.y - 330, anchor.h - 20 - 724));
        return { left, top, maxHeight: Math.min(724, anchor.h - top - 20) };
      })()
    : null;

  const pager: Pager | null =
    spotIds && selectedId && spotIds.length > 1
      ? (() => {
          const index = Math.max(0, spotIds.indexOf(selectedId));
          const go = (i: number) => select(spotIds[(i + spotIds.length) % spotIds.length], spotIds);
          return {
            index,
            total: spotIds.length,
            prev: () => go(index - 1),
            next: () => go(index + 1),
          };
        })()
      : null;

  function toggleSave(id: string) {
    const next = saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id];
    setSaved(next);
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    } catch {
      // Storage blocked: the job stays saved until the page closes.
    }
  }

  async function share(job: PublicJob) {
    const url = new URL(`/?job=${job.id}`, window.location.origin).toString();
    const title = displayTitle(job.title);
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast(t("linkCopied"));
    } catch {
      // Share sheet closed.
    }
  }

  function showAll() {
    setDistance(null);
    setTarget(boundsOf(jobs));
  }

  const distanceText =
    distance === null ? t("anyDistanceLong") : t("withinKmLong", { km: distance });

  const distanceMenu = (
    <ul
      role="menu"
      aria-label={t("distanceLabel")}
      className="absolute top-full right-0 z-[1100] mt-2 w-60 rounded-3xl bg-white py-2 shadow-wm-2"
    >
      {DISTANCES.map((d) => (
        <li key={d ?? "any"} role="none">
          <button
            type="button"
            role="menuitemradio"
            aria-checked={distance === d}
            disabled={d !== null && !origin}
            onClick={() => {
              setDistance(d);
              setDistanceOpen(false);
              setFiltersOpen(false);
            }}
            className={cn(
              "flex h-11 w-full items-center px-4 text-start text-sm font-semibold hover:bg-wm-mist disabled:opacity-40",
              distance === d && "text-wm-blue",
            )}
          >
            {d === null ? t("anyDistanceLong") : t("withinKmLong", { km: d })}
          </button>
        </li>
      ))}
      {!origin ? (
        <li className="px-4 pt-1 pb-2 text-xs text-wm-caption">{t("distanceNeedsPlace")}</li>
      ) : null}
    </ul>
  );

  // Rendered in both top bars (CSS shows one); the desktop one has the handle.
  const placeSearch = (withRef: boolean) => (
    <PlaceSearch
      ref={withRef ? search : undefined}
      bare
      bounds={bounds}
      label={t("whereLabel")}
      placeholder={t("wherePlaceholder")}
      className="static"
      inputClassName="text-sm font-medium text-wm-body"
      listClassName="bg-white shadow-wm-2 mt-3"
      onPick={(place) => {
        setOrigin({ point: [place.lat, place.lng], kind: "place" });
        if (place.bbox) {
          const [w, s, e, n] = place.bbox;
          setTarget({
            bounds: [
              [s, w],
              [n, e],
            ],
          });
        } else setTarget({ center: [place.lat, place.lng], zoom: 13 });
      }}
    />
  );

  const nearMe = (
    <button
      type="button"
      onClick={locate}
      aria-pressed={origin?.kind === "me"}
      className={cn(
        "flex shrink-0 items-center rounded-full border-0 bg-wm-ink font-bold text-white shadow-wm-1",
        "h-[38px] gap-[7px] ps-[11px] pe-[13px] text-[13px] sm:h-10 sm:gap-2 sm:ps-3 sm:pe-3.5",
      )}
    >
      <WmIcon
        name="nearMe"
        size={16}
        stroke={2.2}
        className={cn("size-[15px] sm:size-4", locating && "animate-pulse")}
      />
      {t("nearMe")}
    </button>
  );

  return (
    <div className="wm-ui relative h-dvh overflow-hidden bg-wm-land font-sans text-wm-ink">
      <h1 className="sr-only">{t("pageTitle")}</h1>
      <ExploreMap
        jobs={mapJobs}
        bounds={bounds}
        selectedId={selectedId}
        onSelect={(id) => select(id)}
        onSpot={(ids) => select(ids[0] ?? null, ids)}
        onEmptyClick={() => select(null)}
        target={target}
        me={origin?.kind === "me" ? origin.point : null}
        label={t("mapLabel")}
        variant={variant}
        onReady={setMap}
        onView={setView}
      />

      {/* Both top bars are rendered; CSS picks one, so phones never flash the desktop bar. */}
      <div className="sm:hidden">
        {/* ------------------------------------------------------- phone top */}
        <div className="absolute inset-x-4 top-3.5 z-[1000] flex flex-col gap-2.5">
          <div
            className={cn(
              "relative flex h-[60px] items-center gap-2.5 rounded-full px-2",
              floating,
            )}
          >
            <Link
              href="/for-sponsors"
              aria-label={t("aboutWemuste")}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-wm-blue text-xl font-extrabold text-white"
            >
              W
            </Link>
            <label className="flex min-w-0 grow flex-col gap-px">
              <span className="text-xs font-extrabold">{t("where")}</span>
              {placeSearch(false)}
            </label>
            <button
              type="button"
              aria-label={t("filters")}
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((v) => !v)}
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-wm-line bg-white text-wm-ink"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="17" x2="20" y2="17" />
                <circle cx="9" cy="7" r="2.5" fill="#FFFFFF" />
                <circle cx="15" cy="17" r="2.5" fill="#FFFFFF" />
              </svg>
            </button>
            {filtersOpen ? (
              <div className="absolute inset-x-0 top-full z-[1100] mt-2 rounded-3xl bg-white p-4 shadow-wm-2">
                <p className="text-xs font-extrabold">{t("distanceLabel")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DISTANCES.map((d) => (
                    <button
                      key={d ?? "any"}
                      type="button"
                      aria-pressed={distance === d}
                      disabled={d !== null && !origin}
                      onClick={() => {
                        setDistance(d);
                        setFiltersOpen(false);
                      }}
                      className={cn(
                        "h-10 rounded-full px-3.5 text-[13px] font-bold disabled:opacity-40",
                        distance === d ? "bg-wm-blue text-white" : "bg-wm-mist text-wm-ink",
                      )}
                    >
                      {d === null ? t("anyDistanceLong") : t("kmShort", { km: d })}
                    </button>
                  ))}
                </div>
                {!origin ? (
                  <p className="mt-2 text-xs text-wm-caption">{t("distanceNeedsPlace")}</p>
                ) : null}
                <Link
                  href="/login"
                  className="mt-4 flex h-11 items-center justify-center gap-2 rounded-full border border-wm-line text-sm font-bold text-wm-ink"
                >
                  <span className="text-wm-blue">
                    <WmIcon name="briefcase" size={17} stroke={2.1} />
                  </span>
                  {t("employerLogin")}
                </Link>
              </div>
            ) : null}
          </div>
          <div className="-me-4 flex [scrollbar-width:none] gap-2 overflow-x-auto">{nearMe}</div>
        </div>
      </div>
      <div className="hidden sm:block">
        {/* ----------------------------------------------------- desktop top */}
        <Link
          href="/for-sponsors"
          aria-label={t("aboutWemuste")}
          className={cn(
            "absolute top-5 left-6 z-[1000] box-border flex h-16 items-center gap-[11px] rounded-[20px] ps-3 pe-5 text-wm-ink no-underline",
            floating,
          )}
        >
          <span className="flex size-10 items-center justify-center rounded-[13px] bg-wm-blue text-[21px] font-extrabold tracking-[-1px] text-white shadow-[inset_0_-3px_0_rgba(0,0,0,0.12)]">
            W
          </span>
          <span className="flex flex-col">
            <span className="text-[19px] leading-[1.1] font-extrabold tracking-[-0.4px]">
              Wemuste
            </span>
            <span className="text-[11px] font-semibold text-wm-caption">{t("tagline")}</span>
          </span>
        </Link>

        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            search.current?.submit();
          }}
          className={cn(
            "absolute top-5 left-1/2 z-[1000] box-border flex h-16 w-[min(680px,calc(100vw-440px))] -translate-x-1/2 items-center rounded-full p-2",
            floating,
          )}
        >
          <label className="relative box-border flex h-12 min-w-0 grow flex-col justify-center gap-px rounded-full bg-wm-mist px-5">
            <span className="text-xs font-extrabold text-wm-ink">{t("where")}</span>
            {placeSearch(true)}
          </label>
          <span className="mx-1 h-7 w-px bg-wm-line" aria-hidden="true" />
          <div className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={distanceOpen}
              onClick={() => setDistanceOpen((v) => !v)}
              className="flex h-12 flex-col items-start justify-center gap-px rounded-full border-0 bg-transparent px-[18px] hover:bg-wm-mist"
            >
              <span className="text-xs font-extrabold text-wm-ink">{t("distanceLabel")}</span>
              <span className="text-sm font-medium whitespace-nowrap text-wm-slate">
                {distanceText}
              </span>
            </button>
            {distanceOpen ? distanceMenu : null}
          </div>
          <button
            type="submit"
            aria-label={t("search")}
            className="flex size-12 shrink-0 items-center justify-center rounded-full border-0 bg-wm-blue text-white shadow-wm-nav hover:bg-wm-blue-pressed"
          >
            <WmIcon name="search" size={19} stroke={2.4} />
          </button>
        </form>

        <Link
          href="/login"
          className={cn(
            "absolute top-[30px] right-6 z-[1000] flex h-11 items-center gap-2 rounded-full ps-3.5 pe-[18px] text-sm font-bold text-wm-ink no-underline",
            floating,
          )}
        >
          <span className="text-wm-blue">
            <WmIcon name="briefcase" size={17} stroke={2.1} />
          </span>
          {t("employerLogin")}
        </Link>

        <nav
          aria-label={t("filters")}
          className="pointer-events-none absolute inset-x-0 top-[100px] z-[999] flex justify-center gap-2"
        >
          <span className="pointer-events-auto">{nearMe}</span>
        </nav>
      </div>

      {/* Count pill, "Search as I move the map", and the empty state */}
      {/* Phones hide it while the job sheet is open. */}
      <div
        className={cn(
          "absolute right-4 bottom-4 left-4 z-[1000] flex flex-wrap items-center gap-3 sm:right-auto sm:bottom-6 sm:left-6 sm:flex-nowrap",
          selected && "max-sm:hidden",
        )}
      >
        <div
          className={cn(
            "box-border flex h-12 items-center gap-3.5 rounded-full ps-[18px] pe-[18px] sm:pe-2",
            floating,
          )}
        >
          <span className="text-sm font-extrabold whitespace-nowrap text-wm-ink" aria-live="polite">
            {t("jobsInArea", { count })}
          </span>
          <span className="hidden h-[22px] w-px bg-wm-line sm:block" aria-hidden="true" />
          {
            <button
              type="button"
              aria-pressed={moveSearch}
              onClick={() => setMoveSearch((v) => !v)}
              className="hidden h-9 items-center gap-2.5 rounded-full border-0 bg-transparent px-2.5 text-[13px] font-semibold whitespace-nowrap text-wm-body sm:flex"
            >
              <span
                className={cn(
                  "relative h-[22px] w-9 shrink-0 rounded-full transition-colors duration-150",
                  moveSearch ? "bg-wm-blue" : "bg-[#CBD2DC]",
                )}
                aria-hidden="true"
              >
                <span
                  className={cn(
                    "absolute top-[3px] size-4 rounded-full bg-white shadow-[0_1px_3px_rgba(11,18,32,0.3)] transition-[left] duration-150",
                    moveSearch ? "left-[17px]" : "left-[3px]",
                  )}
                />
              </span>
              {t("searchAsMove")}
            </button>
          }
        </div>
        {count === 0 ? (
          <button
            type="button"
            onClick={showAll}
            className="h-12 rounded-full border-0 bg-wm-ink px-[18px] text-[13px] font-bold text-white shadow-wm-2"
          >
            {t("emptyShowAll")}
          </button>
        ) : null}
      </div>

      {/* Map controls */}
      <button
        type="button"
        onClick={locate}
        aria-label={t("myLocation")}
        className="absolute top-[206px] right-4 z-[999] flex size-11 items-center justify-center rounded-full border-0 bg-white text-wm-blue shadow-wm-2 sm:hidden"
      >
        <WmIcon name="navigate" size={18} stroke={2.2} />
      </button>
      <div className="absolute right-6 bottom-11 z-[1000] hidden flex-col gap-2.5 sm:flex">
        <button
          type="button"
          aria-label={t("mapStyle")}
          aria-pressed={variant === "satellite"}
          onClick={() => setVariant((v) => (v === "light" ? "satellite" : "light"))}
          className="flex size-11 items-center justify-center rounded-full border-0 bg-white text-wm-ink shadow-wm-1"
        >
          <WmIcon name="layers" size={17} stroke={2.2} />
        </button>
        <button
          type="button"
          aria-label={t("myLocation")}
          onClick={locate}
          className="flex size-11 items-center justify-center rounded-full border-0 bg-white text-wm-blue shadow-wm-1"
        >
          <WmIcon name="navigate" size={17} stroke={2.2} />
        </button>
        <div className="flex flex-col overflow-hidden rounded-full bg-white shadow-wm-2">
          <button
            type="button"
            aria-label={t("zoomIn")}
            onClick={() => map?.zoomIn()}
            className="flex h-[46px] w-11 items-center justify-center border-0 bg-transparent text-wm-ink"
          >
            <WmIcon name="plus" size={17} stroke={2.4} />
          </button>
          <span className="mx-2.5 h-px bg-wm-line" aria-hidden="true" />
          <button
            type="button"
            aria-label={t("zoomOut")}
            onClick={() => map?.zoomOut()}
            className="flex h-[46px] w-11 items-center justify-center border-0 bg-transparent text-wm-ink"
          >
            <WmIcon name="minus" size={17} stroke={2.4} />
          </button>
        </div>
      </div>

      {/* The job card, only when a pin is picked */}
      {selected && mobile ? (
        <JobSheet
          item={selected}
          pager={pager}
          saved={saved.includes(selected.job.id)}
          onToggleSave={() => toggleSave(selected.job.id)}
          onClose={() => select(null)}
          headingRef={heading}
        />
      ) : null}
      {selected && !mobile && cardStyle ? (
        <JobCard
          key={selected.job.id}
          item={selected}
          pager={pager}
          saved={saved.includes(selected.job.id)}
          onToggleSave={() => toggleSave(selected.job.id)}
          onShare={() => void share(selected.job)}
          onClose={() => select(null)}
          headingRef={heading}
          style={cardStyle}
        />
      ) : null}
    </div>
  );
}
