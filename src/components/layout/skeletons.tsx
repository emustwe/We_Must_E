import { cn } from "@/lib/utils";

// Lightweight placeholders shown while a page streams in (no JS needed).
export function Bone({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-muted", className)} aria-hidden="true" />;
}

export function ListSkeleton({ rows = 4, label }: { rows?: number; label: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-4 py-2">
      <Bone className="h-9 w-48" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="shadow-float space-y-3 rounded-3xl bg-card p-4">
            <div className="flex gap-3">
              <Bone className="size-12 shrink-0" />
              <div className="flex-1 space-y-2">
                <Bone className="h-4 w-3/4" />
                <Bone className="h-3 w-1/2" />
              </div>
            </div>
            <Bone className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MapSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="fixed inset-0 bottom-16 bg-muted sm:bottom-0">
      <div className="absolute inset-x-3 top-3 flex gap-2">
        <Bone className="h-11 w-36 rounded-full bg-background" />
        <Bone className="h-11 w-24 rounded-full bg-background" />
      </div>
      <div className="absolute inset-x-4 bottom-3 lg:hidden">
        <Bone className="h-24 w-[86%] rounded-3xl bg-background" />
      </div>
    </div>
  );
}
