import { z } from "zod";

import { CLUB } from "@forge/consts";

export const MEMBER_DUES_PATH = "/member/dues";
export const MEMBER_DUES_PRICE_CENTS = CLUB.MEMBERSHIP_PRICE;

export const duesPaymentIntentInputSchema = z.object({
  paymentIntentId: z
    .string()
    .trim()
    .min(1, "PaymentIntent id is required.")
    .max(255, "PaymentIntent id is too long."),
});

export type DuesPaymentIntentInput = z.input<
  typeof duesPaymentIntentInputSchema
>;

export interface DuesAcademicYear {
  endYear: number;
  label: string;
  shortLabel: string;
  startYear: number;
}

export function getDuesAcademicYear(referenceDate = new Date()) {
  const utcYear = referenceDate.getUTCFullYear();
  const utcMonth = referenceDate.getUTCMonth();
  const startYear = utcMonth >= 7 ? utcYear : utcYear - 1;

  return buildDuesAcademicYear(startYear);
}

export function buildDuesAcademicYear(startYear: number): DuesAcademicYear {
  const endYear = startYear + 1;
  const shortLabel = `${startYear}-${endYear}`;

  return {
    endYear,
    label: `${shortLabel} academic school year`,
    shortLabel,
    startYear,
  };
}

export function isLateDuesPaymentWindow(referenceDate = new Date()) {
  const utcYear = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth();
  const day = referenceDate.getUTCDate();
  const currentDay = Date.UTC(utcYear, month, day);
  const warningStart = Date.UTC(utcYear, 4, 31);
  const warningEnd = Date.UTC(utcYear, 6, 31);

  return currentDay >= warningStart && currentDay <= warningEnd;
}

export function getDuesPayableYear({
  currentAcademicYearStart,
  hasStaleCurrentYearDues,
}: {
  currentAcademicYearStart: number;
  hasStaleCurrentYearDues: boolean;
}) {
  return hasStaleCurrentYearDues
    ? currentAcademicYearStart + 1
    : currentAcademicYearStart;
}

export function formatDuesAmount(cents = MEMBER_DUES_PRICE_CENTS) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(cents / 100);
}
