import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("login");
  return { title: t("title") };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const t = await getTranslations("login");
  const params = await searchParams;
  const notice =
    params.reset === "1"
      ? t("resetDone")
      : params.signedOut === "all"
        ? t("signedOutAll")
        : params.deleted === "1"
          ? t("deleted")
          : null;
  const linkError = params.link === "invalid" ? t("linkInvalid") : null;

  return (
    <AuthShell
      title={t("title")}
      subtitle={t("subtitle")}
      footer={
        <>
          {t("noAccount")}{" "}
          <Link href="/for-sponsors" className="font-medium text-primary hover:underline">
            {t("createAccount")}
          </Link>
        </>
      }
    >
      {linkError ? (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-sm text-destructive"
        >
          {linkError}
        </p>
      ) : null}
      <LoginForm notice={notice} />
    </AuthShell>
  );
}
