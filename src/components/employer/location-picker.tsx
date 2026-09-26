"use client";

import { LocateFixed, Lock, TriangleAlert } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { PlaceSearch } from "@/components/map/place-search";
import { Button } from "@/components/ui/button";
import { isInside, type Bounds } from "@/lib/jobs/meta";
import { reverseGeocode, type Place } from "@/lib/map/geocode";

const PickerMap = dynamic(() => import("@/components/map/picker-map"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-muted" aria-hidden="true" />,
});

type Point = { lat: number; lng: number };
export type PlaceDetails = { label: string; countryCode: string | null; city: string | null };
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

// Search a place, use the device location, or tap/drag the pin. Every move
// looks up the place name, country and city, which the sponsor can edit.
export function LocationPicker({
  value,
  bounds,
  onChange,
  onDetails,
}: {
  value: Point | null;
  bounds: Bounds;
  onChange: (p: Point) => void;
  onDetails: (details: PlaceDetails) => void;
}) {
  const t = useTranslations("jobForm");
  const [target, setTarget] = useState<{ center: [number, number]; zoom: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState(false);
  const lookup = useRef<AbortController | null>(null);
  const outside = value ? !isInside(bounds, value.lat, value.lng) : false;

  function place(p: Point, found?: Place) {
    const point = { lat: round6(p.lat), lng: round6(p.lng) };
    onChange(point);
    lookup.current?.abort();
    // A search result already knows its country. The public name is always the
    // area around the pin, never the searched building or address.
    const controller = new AbortController();
    lookup.current = controller;
    reverseGeocode(point.lat, point.lng, controller.signal)
      .then((r) => {
        if (!r && !found) return;
        onDetails({
          label: (r?.label ?? found?.city ?? "").slice(0, 200),
          countryCode: r?.countryCode ?? found?.countryCode ?? null,
          city: r?.city ?? found?.city ?? null,
        });
      })
      .catch(() => {});
  }

  function useMyLocation() {
    setLocError(false);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        place(p);
        setTarget({ center: [p.lat, p.lng], zoom: 16 });
      },
      () => {
        setLocating(false);
        setLocError(true);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <PlaceSearch
          bounds={bounds}
          placeholder={t("searchPlace")}
          className="flex-1"
          onPick={(p) => {
            place({ lat: p.lat, lng: p.lng }, p);
            setTarget({ center: [p.lat, p.lng], zoom: 16 });
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="touch"
          onClick={useMyLocation}
          disabled={locating}
        >
          <LocateFixed
            className={locating ? "size-4 animate-pulse" : "size-4"}
            aria-hidden="true"
          />
          {t("useMyLocation")}
        </Button>
      </div>
      {locError ? <p className="text-sm text-muted-foreground">{t("locationBlocked")}</p> : null}
      <div className="relative h-72 overflow-hidden rounded-3xl border sm:h-80">
        <PickerMap
          value={value}
          target={target}
          onPick={(p) => place(p)}
          pinLabel={t("pinLabel")}
        />
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="size-3.5 shrink-0" aria-hidden="true" />
        {t("pinPrivacy")}
      </p>
      {outside ? (
        <p className="flex items-center gap-1.5 text-sm font-medium text-destructive" role="alert">
          <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
          {t("outsideArea")}
        </p>
      ) : null}
    </div>
  );
}
