import { SponsorShell } from "@/components/sponsors/sponsor-shell";
import { getEmployerAccount } from "@/lib/auth/employer";
import { logoUrl } from "@/lib/sponsors/logo";
import { createClient } from "@/lib/supabase/server";

// The sponsor portal, in the light Wemuste design.
export default async function EmployerLayout({ children }: LayoutProps<"/sponsor">) {
  const { profile, employer } = await getEmployerAccount();
  const approved = employer?.status === "approved";
  let jobs = 0;
  let newCandidates = 0;
  if (approved) {
    const supabase = await createClient();
    const [{ count }, { data }] = await Promise.all([
      supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("employer_id", profile.id)
        .neq("status", "removed"),
      supabase.rpc("sponsor_all_candidates", { p_page: 0 }),
    ]);
    jobs = count ?? 0;
    newCandidates = Number(data?.[0]?.locked_total ?? 0);
  }
  return (
    <SponsorShell
      company={
        employer
          ? {
              name: employer.company_name,
              logoUrl: logoUrl(employer.logo_path),
              approved,
              balance: employer.ecoin_balance,
              jobs,
              newCandidates,
            }
          : null
      }
      person={employer?.contact_person || profile.full_name || employer?.company_name || "Sponsor"}
    >
      {children}
    </SponsorShell>
  );
}
