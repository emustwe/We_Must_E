"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { WmIcon, type IconName } from "@/components/map/wm-icons";

// The design's filter dropdown ("Label Value" with a chevron), backed by a
// native select so it stays accessible. Changing it updates one URL param.
export function FilterSelect({
  label,
  param,
  value,
  options,
  icon = "chevronDown",
  reset = ["page"],
}: {
  label: string;
  param: string;
  value: string;
  options: { value: string; label: string }[];
  icon?: IconName;
  reset?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = options.find((o) => o.value === value) ?? options[0];
  return (
    <label className="relative flex h-[42px] max-w-full cursor-pointer items-center gap-2 rounded-xl border border-wm-field bg-white ps-3.5 pe-3 text-[13px] whitespace-nowrap text-wm-ink focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-wm-blue">
      <span className="font-semibold text-wm-caption">{label}</span>
      <span className="max-w-44 truncate font-bold">{current?.label}</span>
      <span className="ms-auto flex text-wm-caption">
        <WmIcon name={icon} size={15} stroke={2.4} />
      </span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(params);
          if (e.target.value) next.set(param, e.target.value);
          else next.delete(param);
          for (const r of reset) next.delete(r);
          router.push(`${pathname}${next.size ? `?${next}` : ""}`);
        }}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
