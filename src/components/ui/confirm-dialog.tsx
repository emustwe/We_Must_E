"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export type ConfirmOptions = {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
};

type Ask = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Ask | null>(null);

// A centred confirmation pop-up in the app's own style, used instead of the
// browser's window.confirm(). It uses <dialog> for focus handling, Escape
// and screen readers: `if (!(await confirm({ title }))) return;`
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("common");
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const ask = useCallback<Ask>((next) => {
    resolver.current?.(false);
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  useEffect(() => {
    if (options && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [options]);

  function close(answer: boolean) {
    resolver.current?.(answer);
    resolver.current = null;
    dialog.current?.close();
    setOptions(null);
  }

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      <dialog
        ref={dialog}
        aria-labelledby="confirm-title"
        aria-describedby={options?.body ? "confirm-body" : undefined}
        onCancel={(e) => {
          e.preventDefault();
          close(false);
        }}
        onClick={(e) => {
          // A tap on the dimmed background cancels.
          if (e.target === dialog.current) close(false);
        }}
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-[1.75rem] bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        {options ? (
          <div className="p-6">
            {options.tone === "danger" ? (
              <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <TriangleAlert className="size-5" aria-hidden="true" />
              </span>
            ) : null}
            <h2 id="confirm-title" className="text-lg font-extrabold">
              {options.title}
            </h2>
            {options.body ? (
              <p id="confirm-body" className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {options.body}
              </p>
            ) : null}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" size="touch" onClick={() => close(false)} autoFocus>
                {options.cancelLabel ?? t("cancel")}
              </Button>
              <Button
                variant={options.tone === "danger" ? "destructive" : "default"}
                size="touch"
                onClick={() => close(true)}
              >
                {options.confirmLabel ?? t("confirm")}
              </Button>
            </div>
          </div>
        ) : null}
      </dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): Ask {
  const ask = useContext(ConfirmContext);
  if (!ask) throw new Error("useConfirm needs <ConfirmProvider>");
  return ask;
}
