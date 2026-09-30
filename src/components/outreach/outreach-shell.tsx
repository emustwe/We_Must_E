import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { MapBackdrop } from "@/components/map/map-backdrop";

// The private outreach pages: the map behind, the W logo, one white card.
export async function OutreachShell({ children }: { children: ReactNode }) {
  const tl = await getTranslations("landing");
  return (
    <div className="wm-ui relative flex min-h-dvh flex-col bg-wm-land font-sans text-wm-ink">
      <MapBackdrop alt={tl("mapAlt")} pins={false} />
      <header className="relative z-10 flex px-4 pt-4 sm:px-6 sm:pt-6">
        <span className="flex items-center gap-2.5 rounded-[20px] bg-white py-2 ps-2 pe-4 shadow-wm-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-wm-blue text-lg font-extrabold text-white">
            W
          </span>
          <span className="text-[17px] font-extrabold tracking-[-0.4px]">WemustE</span>
        </span>
      </header>
      <main className="relative z-10 mx-auto flex w-full max-w-3xl grow flex-col px-4 py-6 sm:py-10">
        <div className="flex flex-col gap-5 rounded-[28px] bg-white p-5 shadow-wm-3 sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
