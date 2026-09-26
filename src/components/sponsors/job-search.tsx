"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { WmIcon } from "@/components/map/wm-icons";

// "Search your jobs" (URL ?q=).
export function JobSearch({ value, label }: { value: string; label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(value);
  useEffect(() => {
    if (q === value) return;
    const id = window.setTimeout(() => {
      const next = new URLSearchParams(params);
      if (q.trim()) next.set("q", q.trim());
      else next.delete("q");
      router.replace(`${pathname}${next.size ? `?${next}` : ""}`);
    }, 300);
    return () => window.clearTimeout(id);
  }, [q, value, params, pathname, router]);
  return (
    <label className="flex h-[42px] w-full items-center gap-2 rounded-xl border border-wm-field bg-white px-3 text-wm-caption sm:w-[280px]">
      <WmIcon name="search" size={16} stroke={2.2} />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={label}
        aria-label={label}
        className="min-w-0 grow border-0 bg-transparent text-sm text-wm-ink outline-none focus-visible:outline-none"
      />
    </label>
  );
}
