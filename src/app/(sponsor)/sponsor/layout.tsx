import { AppHeader } from "@/components/layout/app-header";
import { SponsorHeaderBar } from "@/components/sponsors/sponsor-header-bar";
import { getEmployerAccount } from "@/lib/auth/employer";

export default async function EmployerLayout({ children }: LayoutProps<"/sponsor">) {
  const { employer } = await getEmployerAccount();
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader
        homeHref="/sponsor"
        subtitle={employer?.company_name}
        actions={
          employer?.status === "approved" ? (
            <SponsorHeaderBar balance={employer.ecoin_balance} />
          ) : null
        }
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-16 sm:px-6">{children}</main>
    </div>
  );
}
