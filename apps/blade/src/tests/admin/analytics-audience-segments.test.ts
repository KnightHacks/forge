import { describe, expect, it } from "vitest";

import type { AnalyticsReport } from "~/app/_components/admin/analytics/analytics-report-types";
import {
  buildCompositionPieRows,
  COMBINED_UNDERGRADUATE_LABEL,
  isUndergraduateLevel,
  mergeUndergraduateAffinityRows,
  mergeUndergraduateDemographicRows,
} from "~/app/_components/admin/analytics/analytics-audience-segments";

describe("buildCompositionPieRows", () => {
  it("keeps stable category colors and combines only the deterministic tail", () => {
    const rows = Array.from({ length: 14 }, (_, index) => ({
      category: `Category ${String.fromCharCode(65 + index)}`,
      count: 20 - index,
    }));
    const first = buildCompositionPieRows(rows);
    const reordered = buildCompositionPieRows([...rows].reverse());

    expect(first).toEqual(reordered);
    expect(first).toHaveLength(12);
    expect(first.at(-1)).toMatchObject({
      category: "Other categories (3)",
      count: 24,
    });
    const firstRow = rows[0];
    expect(firstRow).toBeDefined();
    if (!firstRow) return;
    expect(first[0]?.color).toBe(buildCompositionPieRows([firstRow])[0]?.color);
  });

  it("keeps protected truth categories and stored Other outside the tail", () => {
    const substantive = Array.from({ length: 14 }, (_, index) => ({
      category: `School ${String.fromCharCode(65 + index)}`,
      count: 30 - index,
    }));
    const protectedRows = [
      { category: "Missing", count: 1 },
      { category: "Invalid", count: 1 },
      { category: "Unknown", count: 1 },
      { category: "Not applicable", count: 1 },
      { category: "Prefer not to answer", count: 1 },
      { category: "Other", count: 1 },
    ];

    const result = buildCompositionPieRows([...substantive, ...protectedRows]);

    for (const row of protectedRows) {
      expect(result).toContainEqual(
        expect.objectContaining({ category: row.category, count: row.count }),
      );
    }
    expect(
      result.find((row) => row.category.startsWith("Other categories")),
    ).toMatchObject({ count: 74 });
    expect(result.reduce((sum, row) => sum + row.count, 0)).toBe(
      [...substantive, ...protectedRows].reduce(
        (sum, row) => sum + row.count,
        0,
      ),
    );
  });
});

type DemographicRows =
  AnalyticsReport["audience"]["demographics"]["level_of_study"]["rows"];
type AffinityRows = AnalyticsReport["audience"]["affinity"];

const demographicRows: DemographicRows = [
  {
    attendeeCount: 3,
    audienceShare: 0.2,
    baseCount: 5,
    baseShare: 0.161,
    category: "Undergraduate University (2 year)",
    duesPaidRate: null,
    participationRate: 0.6,
    repeatAttendeeRate: null,
    representationGap: 0.039,
  },
  {
    attendeeCount: 4,
    audienceShare: 0.267,
    baseCount: 8,
    baseShare: 0.258,
    category:
      "Undergraduate University (2 year - community college or similar)",
    duesPaidRate: 0.5,
    participationRate: 0.5,
    repeatAttendeeRate: 0.25,
    representationGap: 0.009,
  },
  {
    attendeeCount: 6,
    audienceShare: 0.4,
    baseCount: 12,
    baseShare: 0.387,
    category: "Undergraduate University (3+ year)",
    duesPaidRate: 0.75,
    participationRate: 0.5,
    repeatAttendeeRate: 0.5,
    representationGap: 0.013,
  },
  {
    attendeeCount: 2,
    audienceShare: 0.133,
    baseCount: 6,
    baseShare: 0.194,
    category: "Graduate University",
    duesPaidRate: 0.2,
    participationRate: 0.333,
    repeatAttendeeRate: 0.5,
    representationGap: -0.061,
  },
  {
    attendeeCount: 0,
    audienceShare: null,
    baseCount: 0,
    baseShare: null,
    category: "High School",
    duesPaidRate: null,
    participationRate: null,
    repeatAttendeeRate: null,
    representationGap: null,
  },
];

describe("isUndergraduateLevel", () => {
  it("matches every MLH undergraduate wording", () => {
    expect(isUndergraduateLevel("Undergraduate University (2 year)")).toBe(
      true,
    );
    expect(
      isUndergraduateLevel(
        "Undergraduate University (2 year - community college or similar)",
      ),
    ).toBe(true);
    expect(isUndergraduateLevel("Undergraduate University (3+ year)")).toBe(
      true,
    );
  });

  it("does not match other levels or the combined label itself", () => {
    expect(isUndergraduateLevel("Graduate University")).toBe(false);
    expect(isUndergraduateLevel("High School")).toBe(false);
    expect(isUndergraduateLevel(COMBINED_UNDERGRADUATE_LABEL)).toBe(false);
  });
});

describe("mergeUndergraduateDemographicRows", () => {
  it("returns the original rows untouched when no level is undergraduate", () => {
    const rows = demographicRows.filter(
      (row) => !isUndergraduateLevel(row.category),
    );

    expect(mergeUndergraduateDemographicRows(rows)).toBe(rows);
  });

  it("collapses the three undergraduate levels into one weighted segment", () => {
    const merged = mergeUndergraduateDemographicRows(demographicRows);
    const combined = merged.find(
      (row) => row.category === COMBINED_UNDERGRADUATE_LABEL,
    );

    expect(merged).toHaveLength(3);
    expect(combined?.baseCount).toBe(25);
    expect(combined?.attendeeCount).toBe(13);
    // Shares stay against the full population, undergraduate rows included.
    expect(combined?.baseShare).toBeCloseTo(25 / 31, 10);
    expect(combined?.audienceShare).toBeCloseTo(13 / 15, 10);
    expect(combined?.representationGap).toBeCloseTo(13 / 15 - 25 / 31, 10);
    expect(combined?.participationRate).toBeCloseTo(13 / 25, 10);
  });

  it("weights repeat and dues rates by the population each came from", () => {
    const combined = mergeUndergraduateDemographicRows(demographicRows).find(
      (row) => row.category === COMBINED_UNDERGRADUATE_LABEL,
    );

    // A missing rate contributes no members, not an average of zero rows:
    // repeat = (0*3 + 0.25*4 + 0.5*6) / 13, dues = (0*5 + 0.5*8 + 0.75*12) / 25.
    expect(combined?.repeatAttendeeRate).toBeCloseTo(4 / 13, 10);
    expect(combined?.duesPaidRate).toBeCloseTo(13 / 25, 10);
  });

  it("leaves other levels alone and reorders by profile count", () => {
    const merged = mergeUndergraduateDemographicRows(demographicRows);

    expect(merged.map((row) => row.category)).toStrictEqual([
      COMBINED_UNDERGRADUATE_LABEL,
      "Graduate University",
      "High School",
    ]);
    expect(merged[1]).toStrictEqual(demographicRows[3]);
  });

  it("breaks a profile-count tie alphabetically", () => {
    const tied: DemographicRows = [
      "Undergraduate University (3+ year)",
      "Zeta University",
      "Alpha University",
    ].map((category) => ({
      attendeeCount: 1,
      audienceShare: 0.333,
      baseCount: 6,
      baseShare: 0.333,
      category,
      duesPaidRate: null,
      participationRate: null,
      repeatAttendeeRate: null,
      representationGap: null,
    }));

    expect(
      mergeUndergraduateDemographicRows(tied).map((row) => row.category),
    ).toStrictEqual([
      "Alpha University",
      COMBINED_UNDERGRADUATE_LABEL,
      "Zeta University",
    ]);
  });

  it("reports no rate at all when the merged segment is empty", () => {
    const empty: DemographicRows = [
      {
        attendeeCount: 0,
        audienceShare: null,
        baseCount: 0,
        baseShare: null,
        category: "Undergraduate University (2 year)",
        duesPaidRate: null,
        participationRate: null,
        repeatAttendeeRate: null,
        representationGap: null,
      },
    ];
    const combined = mergeUndergraduateDemographicRows(empty)[0];

    expect(combined?.category).toBe(COMBINED_UNDERGRADUATE_LABEL);
    expect(combined?.baseShare).toBeNull();
    expect(combined?.audienceShare).toBeNull();
    expect(combined?.representationGap).toBeNull();
    expect(combined?.participationRate).toBeNull();
    expect(combined?.repeatAttendeeRate).toBeNull();
    expect(combined?.duesPaidRate).toBeNull();
  });
});

describe("mergeUndergraduateAffinityRows", () => {
  const affinityRows: AffinityRows = [
    {
      attendanceCount: 12,
      category: "Undergraduate University (3+ year)",
      eventCount: 4,
      label: "Social",
      memberCount: 6,
    },
    {
      attendanceCount: 5,
      category: "Undergraduate University (2 year)",
      eventCount: 7,
      label: "Social",
      memberCount: 3,
    },
    {
      attendanceCount: 9,
      category: "Graduate University",
      eventCount: 2,
      label: "Workshop",
      memberCount: 4,
    },
    {
      attendanceCount: 9,
      category: "Undergraduate University (2 year)",
      eventCount: 1,
      label: "Workshop",
      memberCount: 2,
    },
    {
      attendanceCount: 9,
      category: "Graduate University",
      eventCount: 3,
      label: "Aardvark",
      memberCount: 1,
    },
  ];

  it("merges undergraduate rows per event type and keeps the rest", () => {
    const merged = mergeUndergraduateAffinityRows(affinityRows);

    expect(merged).toStrictEqual([
      {
        attendanceCount: 17,
        category: COMBINED_UNDERGRADUATE_LABEL,
        eventCount: 7,
        label: "Social",
        memberCount: 9,
      },
      affinityRows[4],
      affinityRows[2],
      {
        attendanceCount: 9,
        category: COMBINED_UNDERGRADUATE_LABEL,
        eventCount: 1,
        label: "Workshop",
        memberCount: 2,
      },
    ]);
  });

  it("counts events as the widest single level, not the sum", () => {
    const merged = mergeUndergraduateAffinityRows(affinityRows);

    // The same four Social events can appear under two undergraduate levels.
    expect(merged[0]?.eventCount).toBe(7);
  });

  it("returns an empty list unchanged", () => {
    expect(mergeUndergraduateAffinityRows([])).toStrictEqual([]);
  });
});
