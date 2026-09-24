import { getTranslations } from "next-intl/server";
import { formatPayAmount, type PayPeriod } from "@/lib/jobs/meta";

export async function PayLabelServer({
  min,
  max,
  period,
  currency,
  className,
}: {
  min: number;
  max: number | null;
  period: PayPeriod;
  currency: string;
  className?: string;
}) {
  const t = await getTranslations("payPeriod");
  return (
    <span className={className}>
      {formatPayAmount(min, max, currency)}
      <span className="font-medium text-muted-foreground"> {t(period)}</span>
    </span>
  );
}
