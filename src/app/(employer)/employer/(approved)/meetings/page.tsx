import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EmployerMeetingCard } from "@/components/meetings/employer-meeting-card";
import type { Slot } from "@/components/meetings/slot-label";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meetings");
  return { title: t("title") };
}

export default async function EmployerMeetingsPage() {
  const profile = await requireRole("employer");
  const t = await getTranslations("meetings");
  const tc = await getTranslations("candidates");
  const supabase = await createClient();
  const { data: meetings } = await supabase
    .from("meeting_requests")
    .select("id, status, proposed_slots, chosen_slot, meeting_link, employee_id, created_at")
    .eq("employer_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const ids = [...new Set((meetings ?? []).map((m) => m.employee_id))];
  // Labels come through RLS: name with `contact` access, otherwise headline.
  const [{ data: people }, { data: names }] = ids.length
    ? await Promise.all([
        supabase.from("employee_profiles").select("user_id, headline").in("user_id", ids),
        supabase.from("profiles").select("id, full_name").in("id", ids),
      ])
    : [{ data: [] }, { data: [] }];
  const label = (id: string) =>
    names?.find((n) => n.id === id)?.full_name ||
    people?.find((p) => p.user_id === id)?.headline ||
    tc("anonymous");

  return (
    <div>
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">{t("title")}</h1>
      {!meetings?.length ? (
        <div className="flex flex-col items-center gap-3 rounded-[2rem] border-2 border-dashed p-10 text-center">
          <CalendarDays className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-muted-foreground">{t("empty")}</p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {meetings.map((m) => (
            <EmployerMeetingCard
              key={m.id}
              meeting={{
                id: m.id,
                status: m.status,
                slots: m.proposed_slots as Slot[],
                chosen: m.chosen_slot,
                link: m.meeting_link,
                employeeId: m.employee_id,
                who: label(m.employee_id),
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
