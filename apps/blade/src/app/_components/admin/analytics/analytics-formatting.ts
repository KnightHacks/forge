import { formatClubDate, formatClubDateTime } from "~/lib/dates";

/**
 * Analytics measures are missing far more often than they are zero — an empty
 * cohort has no rate, not a rate of 0 — so every formatter here renders `null`
 * as an em dash rather than inventing a number.
 */
export function formatNumber(value: number | null) {
  return value === null ? "—" : new Intl.NumberFormat("en-US").format(value);
}

export function formatDecimal(value: number | null, digits = 1) {
  return value === null ? "—" : value.toFixed(digits);
}

export function formatPercent(value: number | null) {
  return value === null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 1,
        style: "percent",
      }).format(value);
}

export function formatDate(value: Date | string | null) {
  return formatClubDate(value);
}

export function formatDateTime(value: Date | string | null) {
  return formatClubDateTime(value, "Not recorded");
}

/**
 * Chart axes cannot wrap, so a long category is clipped to `maxLength`
 * characters with the last one spent on an ellipsis.
 */
export function truncateChartLabel(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}
