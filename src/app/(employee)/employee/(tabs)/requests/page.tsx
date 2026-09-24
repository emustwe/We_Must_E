import { Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { StatusBadge } from "@/components/jobs/job-card";
import { MeetingInvite } from "@/components/meetings/meeting-invite";
import type { Slot } from "@/components/meetings/slot-label";
import { buttonVariants } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { CATEGORY_META } from "@/lib/jobs/meta";
import { logError } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("requests");
  return { title: t("title") };
}

export default async function RequestsPage() {
  await requireRole("employee");
  const t = await getTranslations("requests");
  const format = await getFormatter();
  const supabase = await createClient();
  const [{ data, error }, { data: invites }] = await Promise.all([
    supabase.rpc("employee_list_job_requests"),
    supabase.rpc("employee_list_meeting_requests"),
  ]);
  if (error) logError("employee-requests", error);
  const requests = data ?? [];
  const tm = await getTranslations("meetings");
  const openInvites = (invites ?? []).filter(
    (m) => m.status === "requested" || m.status === "accepted",
  );

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-6 pb-28 sm:px-6">
      {openInvites.length ? (
        <section className="mb-8">
          <h2 className="mb-3 text-xl font-extrabold tracking-tight">{tm("employeeTitle")}</h2>
          <ul className="space-y-3">
            {openInvites.map((m) => (
              <MeetingInvite
                key={m.id}
                invite={{
                  id: m.id,
                  company: m.company_name,
                  slots: m.proposed_slots as Slot[],
                  chosen: m.chosen_slot,
                  link: m.meeting_link,
                  status: m.status,
                }}
              />
            ))}
          </ul>
        </section>
      ) : null}
      <h1 className="text-3xl font-extrabold tracking-tight">{t("title")}</h1>
      {requests.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-4 rounded-[2rem] border border-dashed p-10 text-center">
          <Inbox className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-muted-foreground">{t("empty")}</p>
          <Link href="/employee" className={buttonVariants({ size: "touch" })}>
            {t("browse")}
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {requests.map((request) => {
            const meta = CATEGORY_META[request.category];
            return (
              <li
                key={request.id}
                className="shadow-float flex items-center gap-3 rounded-3xl bg-card p-4"
              >
                <span
                  className={cn(
                    "flex size-12 shrink-0 items-center justify-center rounded-2xl text-2xl",
                    meta.tint,
                  )}
                  aria-hidden="true"
                >
                  {meta.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{request.title}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {request.company_name} · {request.area_label}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {format.relativeTime(new Date(request.created_at))}
                  </p>
                </div>
                <StatusBadge status={request.status} />
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
