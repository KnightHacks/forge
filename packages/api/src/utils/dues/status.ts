import {
  formatDuesAmount,
  getDuesAcademicYear,
  isLateDuesPaymentWindow,
  MEMBER_DUES_PRICE_CENTS,
} from "@forge/validators";

export interface DuesEntitlementStatusRow {
  active: boolean;
  createdAt: Date;
  id: string;
  sourcePaymentId: string | null;
  updatedAt: Date;
  year: number;
}

export interface DuesPaymentStatusRow {
  amount: number;
  id: string;
  paymentDate: Date;
  stripePaymentIntentId: string | null;
  year: number;
}

export function buildDuesStatus({
  entitlements,
  payments,
  referenceDate = new Date(),
}: {
  entitlements: DuesEntitlementStatusRow[];
  payments: DuesPaymentStatusRow[];
  referenceDate?: Date;
}) {
  const currentAcademicYear = getDuesAcademicYear(referenceDate);
  const entitlement = entitlements.find(
    (row) => row.year === currentAcademicYear.startYear && row.active,
  );
  const sourcePayment = entitlement?.sourcePaymentId
    ? payments.find((row) => row.id === entitlement.sourcePaymentId)
    : undefined;

  return {
    amountDue: MEMBER_DUES_PRICE_CENTS,
    amountDueLabel: formatDuesAmount(MEMBER_DUES_PRICE_CENTS),
    amountPaid: sourcePayment?.amount ?? null,
    currentAcademicYear,
    lateYearWarning: isLateDuesPaymentWindow(referenceDate),
    paid: Boolean(entitlement),
    paidAt: entitlement
      ? (sourcePayment?.paymentDate ?? entitlement.updatedAt)
      : null,
    paymentAcademicYear: currentAcademicYear,
    paymentId: sourcePayment?.id ?? null,
    state: entitlement ? ("paid" as const) : ("unpaid" as const),
    stripePaymentIntentId: sourcePayment?.stripePaymentIntentId ?? null,
  };
}
