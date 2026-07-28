import type { AnalyticsReport } from "./analytics-report-types";
import { ratio } from "./analytics-rates";

/**
 * MLH asks for level of study with three separate undergraduate options, which
 * splits one real audience across three rows. Analytics reports them as a single
 * segment; the stored member answers are left untouched.
 */
export const COMBINED_UNDERGRADUATE_LABEL = "Undergraduate University";

const UNDERGRADUATE_LEVELS = new Set([
  "Undergraduate University (2 year)",
  "Undergraduate University (2 year - community college or similar)",
  "Undergraduate University (3+ year)",
]);

export function isUndergraduateLevel(category: string) {
  return UNDERGRADUATE_LEVELS.has(category);
}

export function mergeUndergraduateDemographicRows(
  rows: AnalyticsReport["audience"]["demographics"]["level_of_study"]["rows"],
) {
  const undergraduateRows = rows.filter((row) =>
    isUndergraduateLevel(row.category),
  );
  if (undergraduateRows.length === 0) return rows;

  const baseCount = undergraduateRows.reduce(
    (total, row) => total + row.baseCount,
    0,
  );
  const attendeeCount = undergraduateRows.reduce(
    (total, row) => total + row.attendeeCount,
    0,
  );
  const totalBaseCount = rows.reduce((total, row) => total + row.baseCount, 0);
  const totalAttendeeCount = rows.reduce(
    (total, row) => total + row.attendeeCount,
    0,
  );
  const repeatAttendeeCount = undergraduateRows.reduce(
    (total, row) => total + (row.repeatAttendeeRate ?? 0) * row.attendeeCount,
    0,
  );
  const duesPaidCount = undergraduateRows.reduce(
    (total, row) => total + (row.duesPaidRate ?? 0) * row.baseCount,
    0,
  );
  const baseShare = ratio(baseCount, totalBaseCount);
  const audienceShare = ratio(attendeeCount, totalAttendeeCount);
  const merged = {
    attendeeCount,
    audienceShare,
    baseCount,
    baseShare,
    category: COMBINED_UNDERGRADUATE_LABEL,
    duesPaidRate: ratio(duesPaidCount, baseCount),
    participationRate: ratio(attendeeCount, baseCount),
    repeatAttendeeRate: ratio(repeatAttendeeCount, attendeeCount),
    representationGap:
      baseShare === null || audienceShare === null
        ? null
        : audienceShare - baseShare,
  };

  return [
    ...rows.filter((row) => !isUndergraduateLevel(row.category)),
    merged,
  ].sort(
    (left, right) =>
      right.baseCount - left.baseCount ||
      left.category.localeCompare(right.category),
  );
}

export function mergeUndergraduateAffinityRows(
  rows: AnalyticsReport["audience"]["affinity"],
) {
  const mergedByLabel = new Map<
    string,
    AnalyticsReport["audience"]["affinity"][number]
  >();
  const unmerged = rows.filter((row) => {
    if (!isUndergraduateLevel(row.category)) return true;
    const current = mergedByLabel.get(row.label);
    mergedByLabel.set(row.label, {
      attendanceCount: (current?.attendanceCount ?? 0) + row.attendanceCount,
      category: COMBINED_UNDERGRADUATE_LABEL,
      eventCount: Math.max(current?.eventCount ?? 0, row.eventCount),
      label: row.label,
      memberCount: (current?.memberCount ?? 0) + row.memberCount,
    });
    return false;
  });

  return [...unmerged, ...mergedByLabel.values()].sort(
    (left, right) =>
      right.attendanceCount - left.attendanceCount ||
      left.category.localeCompare(right.category) ||
      left.label.localeCompare(right.label),
  );
}
