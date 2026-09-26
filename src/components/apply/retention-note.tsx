import { useTranslations } from "next-intl";
import { REPLY_WORKING_DAYS, SUPPORT_EMAIL } from "@/lib/legal";
import { cn } from "@/lib/utils";

// How long an application is kept, and how to have it deleted sooner.
export function RetentionNote({ className }: { className?: string }) {
  const t = useTranslations("apply");
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {t.rich("retentionNote", {
        days: REPLY_WORKING_DAYS,
        email: SUPPORT_EMAIL,
        mail: (chunks) => (
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-foreground underline">
            {chunks}
          </a>
        ),
      })}
    </p>
  );
}
