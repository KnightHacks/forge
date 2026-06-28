import { describe, expect, it } from "vitest";

import { getDuesPaymentIdsToInvalidate } from "../../utils/dues/status";
import {
  escapeCsvCell,
  rankAdminMemberCandidates,
} from "../../utils/member/admin";

const candidates = [
  {
    company: "Knight Hacks",
    discordUser: "lenny-dragon",
    email: "lenny@example.test",
    firstName: "Lenny",
    id: "member-lenny",
    lastName: "Dragonson",
    school: "University of Central Florida",
  },
  {
    company: "NVIDIA",
    discordUser: "dvidal",
    email: "dylan@example.test",
    firstName: "Dylan",
    id: "member-dylan",
    lastName: "Vidal",
    school: "University of Central Florida",
  },
] as const;

describe("admin member data utilities", () => {
  it("ranks exact matches before typo-tolerant matches", () => {
    const result = rankAdminMemberCandidates(
      [
        ...candidates,
        {
          ...candidates[0],
          email: "leny@example.test",
          firstName: "Leny",
          id: "member-leny",
        },
      ],
      "lenny",
    );

    expect(result.map(({ candidate }) => candidate.id)).toEqual([
      "member-lenny",
      "member-leny",
    ]);
  });

  it("finds minor misspellings across full names", () => {
    const result = rankAdminMemberCandidates(candidates, "leny dragnson");

    expect(result[0]?.candidate.id).toBe("member-lenny");
  });

  it.each([
    ["dylan@example.test", "member-dylan"],
    ["dvidal", "member-dylan"],
    ["nvidia", "member-dylan"],
    ["university central florida", "member-dylan"],
    ["LENNY---DRAGONSON", "member-lenny"],
  ])("searches every approved field for %s", (query, expectedId) => {
    const result = rankAdminMemberCandidates(candidates, query);

    expect(result[0]?.candidate.id).toBe(expectedId);
  });

  it("escapes CSV syntax and neutralizes spreadsheet formulas", () => {
    expect(escapeCsvCell('Builder, "speaker"')).toBe('"Builder, ""speaker"""');
    expect(escapeCsvCell('=HYPERLINK("https://bad.test")')).toBe(
      '"\'=HYPERLINK(""https://bad.test"")"',
    );
    expect(escapeCsvCell("line one\nline two")).toBe('"line one\nline two"');
    expect(escapeCsvCell("\n+SUM(A1:A2)")).toBe('"\'\n+SUM(A1:A2)"');
  });

  it("invalidates every row that would keep dues effective while preserving unrelated history", () => {
    const paymentDate = new Date("2026-06-20T12:00:00Z");
    const duesRows = [
      {
        active: true,
        amount: 2500,
        id: "current-academic-year",
        paymentDate,
        stripePaymentIntentId: "pi_current",
        year: 2025,
      },
      {
        active: true,
        amount: 2500,
        id: "legacy-manual-calendar-year",
        paymentDate,
        stripePaymentIntentId: null,
        year: 2026,
      },
      {
        active: true,
        amount: 2500,
        id: "historical-row",
        paymentDate,
        stripePaymentIntentId: "pi_historical",
        year: 2024,
      },
      {
        active: true,
        amount: 2500,
        id: "unrelated-future-row",
        paymentDate,
        stripePaymentIntentId: null,
        year: 2027,
      },
    ];

    expect(
      getDuesPaymentIdsToInvalidate({
        duesRows,
        referenceDate: new Date("2026-06-26T12:00:00Z"),
      }),
    ).toEqual(["current-academic-year", "legacy-manual-calendar-year"]);
  });
});
