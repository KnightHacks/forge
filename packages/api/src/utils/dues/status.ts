import {
  buildDuesAcademicYear,
  formatDuesAmount,
  getDuesAcademicYear,
  getDuesPayableYear,
  isLateDuesPaymentWindow,
  MEMBER_DUES_PRICE_CENTS,
} from "@forge/validators";

export interface DuesStatusRow {
  active: boolean;
  amount: number;
  id: string;
  paymentDate: Date;
  stripePaymentIntentId: string | null;
  year: number;
}

export function buildDuesStatus({
  duesRows,
  referenceDate = new Date(),
}: {
  duesRows: DuesStatusRow[];
  referenceDate?: Date;
}) {
  const currentAcademicYear = getDuesAcademicYear(referenceDate);
  const currentYearRows = duesRows.filter(
    (row) => row.year === currentAcademicYear.startYear,
  );
  const activeCurrentYearPayment = currentYearRows.find((row) => row.active);
  const hasStaleCurrentYearDues = currentYearRows.some((row) => !row.active);
  const payableYearStart = getDuesPayableYear({
    currentAcademicYearStart: currentAcademicYear.startYear,
    hasStaleCurrentYearDues,
  });
  const activePayableYearPayment = duesRows.find(
    (row) => row.year === payableYearStart && row.active,
  );
  // Legacy Blade stored the calendar year for both manual grants and Stripe
  // payments. Keep those production rows effective while new writes use the
  // academic-year start.
  const activeLegacyCalendarYearPayment = duesRows.find(
    (row) => row.year === referenceDate.getUTCFullYear() && row.active,
  );
  const paidPayment =
    activeCurrentYearPayment ??
    activePayableYearPayment ??
    activeLegacyCalendarYearPayment;
  const paymentYearStart = paidPayment?.year ?? payableYearStart;

  return {
    amountDue: MEMBER_DUES_PRICE_CENTS,
    amountDueLabel: formatDuesAmount(MEMBER_DUES_PRICE_CENTS),
    amountPaid: paidPayment?.amount ?? null,
    currentAcademicYear,
    currentYearHasStaleDues: hasStaleCurrentYearDues,
    lateYearWarning: isLateDuesPaymentWindow(referenceDate),
    paid: Boolean(paidPayment),
    paidAt: paidPayment?.paymentDate ?? null,
    payableAcademicYear: buildDuesAcademicYear(payableYearStart),
    paymentAcademicYear: buildDuesAcademicYear(paymentYearStart),
    paymentId: paidPayment?.id ?? null,
    state: paidPayment ? ("paid" as const) : ("unpaid" as const),
    stripePaymentIntentId: paidPayment?.stripePaymentIntentId ?? null,
  };
}

export function getDuesPaymentIdsToInvalidate({
  duesRows,
  referenceDate = new Date(),
}: {
  duesRows: DuesStatusRow[];
  referenceDate?: Date;
}) {
  const simulatedRows = duesRows.map((row) => ({ ...row }));
  const paymentIds: string[] = [];

  while (paymentIds.length < simulatedRows.length) {
    const paymentId = buildDuesStatus({
      duesRows: simulatedRows,
      referenceDate,
    }).paymentId;
    if (!paymentId || paymentIds.includes(paymentId)) break;

    const payment = simulatedRows.find((row) => row.id === paymentId);
    if (!payment) break;

    paymentIds.push(paymentId);
    payment.active = false;
  }

  return paymentIds;
}
