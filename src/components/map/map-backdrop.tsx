import { cn } from "@/lib/utils";

// Decorative pins for the static map (positions in % of the image).
const DEMO_PINS = [
  { emoji: "☕", label: "AED 30/hr", top: "30%", left: "58%", delay: "0s" },
  { emoji: "🛵", label: "AED 120/day", top: "46%", left: "72%", delay: "0.6s" },
  { emoji: "🛍️", label: "AED 25/hr", top: "62%", left: "44%", delay: "1.2s" },
  { emoji: "🎉", label: "AED 300", top: "22%", left: "80%", delay: "1.8s" },
  { emoji: "🧽", label: "AED 1.8k/mo", top: "70%", left: "66%", delay: "0.9s" },
  { emoji: "💼", label: "AED 4.5k/mo", top: "14%", left: "64%", delay: "1.5s" },
];

// Full-bleed map picture used behind public pages. It's a static image of the
// same pastel map the app uses, so public pages don't load the map library.
export function MapBackdrop({
  className,
  pins = true,
  alt,
}: {
  className?: string;
  pins?: boolean;
  alt: string;
}) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      <picture>
        <source srcSet="/brand/map-dark.jpg" media="(prefers-color-scheme: dark)" />
        <img
          src="/brand/map-light.jpg"
          alt={alt}
          className="size-full object-cover object-[60%_40%]"
          fetchPriority="high"
          decoding="async"
        />
      </picture>
      {pins ? (
        <div aria-hidden="true">
          {DEMO_PINS.map((pin) => (
            <span
              key={pin.label + pin.top}
              className="shadow-pin animate-float absolute hidden items-center gap-1 rounded-full border-2 border-background bg-background px-2.5 py-1 text-sm font-bold text-foreground sm:inline-flex"
              style={{ top: pin.top, left: pin.left, animationDelay: pin.delay }}
            >
              <span>{pin.emoji}</span>
              {pin.label}
            </span>
          ))}
        </div>
      ) : null}
      <span className="absolute end-2 bottom-2 rounded bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">
        © OpenStreetMap contributors · OpenFreeMap
      </span>
    </div>
  );
}
