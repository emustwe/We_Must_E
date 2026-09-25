"use client";

import { Loader2, MapPin, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import type { Bounds } from "@/lib/jobs/meta";
import { searchPlaces, type Place } from "@/lib/map/geocode";
import { cn } from "@/lib/utils";

// Place search (MapTiler geocoding, English, limited to the service area).
// An accessible combobox: arrow keys move, Enter picks, Escape closes.
export function PlaceSearch({
  bounds,
  onPick,
  placeholder,
  className,
  inputClassName,
  country,
  kind = "any",
  autoFocus,
}: {
  bounds: Bounds;
  country?: string | null;
  kind?: "any" | "city";
  autoFocus?: boolean;
  onPick: (place: Place) => void;
  placeholder: string;
  className?: string;
  inputClassName?: string;
}) {
  const t = useTranslations("placeSearch");
  const listId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        setResults(await searchPlaces(q, bounds, controller.signal, country, kind));
        setActive(-1);
      } catch {
        // Aborted or offline: keep the previous results.
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, bounds, country, kind]);

  useEffect(() => {
    function onDown(e: PointerEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  function pick(place: Place) {
    onPick(place);
    setQuery(place.label);
    setOpen(false);
  }

  const shown = query.trim().length >= 2 ? results : [];

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        type="search"
        role="combobox"
        aria-expanded={open && shown.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        aria-label={placeholder}
        placeholder={placeholder}
        value={query}
        autoComplete="off"
        enterKeyHint="search"
        autoFocus={autoFocus}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, shown.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const place = shown[active >= 0 ? active : 0];
            if (place) pick(place);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={cn(
          "h-12 w-full rounded-full border border-input bg-background ps-10 pe-10 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-search-cancel-button]:hidden",
          inputClassName,
        )}
      />
      {loading ? (
        <Loader2
          className="absolute end-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
          aria-hidden="true"
        />
      ) : query ? (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setResults([]);
          }}
          className="absolute end-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          aria-label={t("clear")}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
      {open && query.trim().length >= 2 ? (
        <ul
          id={listId}
          role="listbox"
          className="shadow-float absolute inset-x-0 top-full z-[1100] mt-2 overflow-hidden rounded-3xl bg-background py-2"
        >
          {shown.length === 0 && !loading ? (
            <li className="px-4 py-3 text-sm text-muted-foreground">{t("noResults")}</li>
          ) : null}
          {shown.map((place, i) => (
            <li
              key={`${place.lat},${place.lng},${i}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => pick(place)}
              className={cn(
                "flex cursor-pointer items-start gap-2 px-4 py-2.5 text-sm",
                i === active ? "bg-muted" : "hover:bg-muted/60",
              )}
            >
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="line-clamp-2">{place.label}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
