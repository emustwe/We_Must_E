import { initials } from "@/lib/sponsors/initials";
import { logoUrl } from "@/lib/sponsors/logo";
import { cn } from "@/lib/utils";

// The sponsor's logo, or their initials when there is none.
export function SponsorLogo({
  name,
  path,
  className,
}: {
  name: string;
  path: string | null | undefined;
  className?: string;
}) {
  const url = logoUrl(path);
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 font-extrabold text-primary",
        className ?? "size-12 text-base",
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- small public logo from storage
        <img src={url} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}
