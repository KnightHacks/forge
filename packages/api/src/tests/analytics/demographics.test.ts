import { describe, expect, it } from "vitest";

import {
  buildCompositionSlices,
  deriveAgeBand,
  filterCategoryRows,
  inferAcademicYear,
  parseDietaryResponse,
  stableCategoryColor,
} from "../../utils/analytics/demographics";

const referenceDate = new Date("2026-08-01T16:00:00.000Z");

describe("shared analytics demographics", () => {
  it("derives completed age at the reference date and preserves truth labels", () => {
    expect(deriveAgeBand(null, referenceDate)).toBe("Missing");
    expect(deriveAgeBand("not-a-date", referenceDate)).toBe("Invalid");
    expect(deriveAgeBand("2008-08-01", referenceDate)).toBe("18-20");
    expect(deriveAgeBand("2008-08-02", referenceDate)).toBe("Under 18");
    expect(deriveAgeBand("2000-02-29", new Date("2021-02-28T17:00:00Z"))).toBe(
      "21-24",
    );
    expect(deriveAgeBand("2008-08-01garbage", referenceDate)).toBe("Invalid");
    expect(
      deriveAgeBand(
        new Date("2008-08-02T00:30:00.000Z"),
        new Date("2026-08-01T12:00:00.000Z"),
      ),
    ).toBe("18-20");
  });

  it("infers 3+ and 2-year programs independently across the August boundary", () => {
    const threeYear = "Undergraduate University (3+ year)";
    const twoYear =
      "Undergraduate University (2 year - community college or similar)";

    expect(inferAcademicYear("2030-05-01", threeYear, referenceDate)).toBe(
      "Freshman (inferred)",
    );
    expect(inferAcademicYear("2029-05-01", threeYear, referenceDate)).toBe(
      "Sophomore (inferred)",
    );
    expect(inferAcademicYear("2028-05-01", twoYear, referenceDate)).toBe(
      "First year - 2-year program (inferred)",
    );
    expect(inferAcademicYear("2027-05-01", twoYear, referenceDate)).toBe(
      "Second year - 2-year program (inferred)",
    );
    expect(inferAcademicYear(null, threeYear, referenceDate)).toBe("Unknown");
    expect(inferAcademicYear("bad", threeYear, referenceDate)).toBe("Invalid");
    expect(
      inferAcademicYear("2028-05-01", "Secondary / High School", referenceDate),
    ).toBe("High school (not inferred)");
    expect(
      inferAcademicYear(
        "2028-05-01",
        "Graduate University (Masters, Professional, Doctoral, etc)",
        referenceDate,
      ),
    ).toBe("Graduate / postdoctoral (not inferred)");
    expect(
      inferAcademicYear("2028-05-01", "Code School / Bootcamp", referenceDate),
    ).toBe("Bootcamp / trade (not inferred)");
  });

  it("keeps protected truth slices and deterministically aggregates only the tail", () => {
    const rows = [
      { category: "A", count: 10 },
      { category: "B", count: 9 },
      { category: "C", count: 8 },
      { category: "D", count: 7 },
      { category: "E", count: 6 },
      { category: "F", count: 5 },
      { category: "G", count: 4 },
      { category: "H", count: 3 },
      { category: "I", count: 2 },
      { category: "J", count: 1 },
      { category: "Other", count: 2 },
      { category: "Prefer not to answer", count: 1 },
      { category: "Missing", count: 1 },
      { category: "Invalid", count: 1 },
      { category: "Unknown", count: 1 },
    ];
    const slices = buildCompositionSlices([...rows].reverse());

    expect(slices.find((row) => row.category === "Other")?.count).toBe(2);
    expect(
      slices.find((row) => row.category === "Other categories")?.count,
    ).toBe(6);
    expect(
      slices.filter((row) => row.protected).map((row) => row.category),
    ).toEqual(
      expect.arrayContaining([
        "Prefer not to answer",
        "Missing",
        "Invalid",
        "Unknown",
      ]),
    );
    expect(slices.reduce((sum, row) => sum + row.count, 0)).toBe(
      rows.reduce((sum, row) => sum + row.count, 0),
    );
    expect(stableCategoryColor("School of Arts")).toBe(
      stableCategoryColor("School of Arts"),
    );
    expect(buildCompositionSlices(rows)).toEqual(
      buildCompositionSlices([
        ...rows.slice(5),
        ...rows.slice(1, 5),
        { category: "A", count: 8 },
        { category: "A", count: 2 },
      ]),
    );
  });

  it("searches full Unicode-normalized labels and resets pagination intent", () => {
    const rows = [
      { category: "Caf\u00e9 Society" },
      { category: "Engineering" },
    ];
    expect(filterCategoryRows(rows, "  CAFE\u0301  ")).toEqual([rows[0]]);
    expect(filterCategoryRows(rows, "missing")).toEqual([]);
    expect(filterCategoryRows(rows, "")).toEqual(rows);
  });

  it("parses only the approved dietary vocabulary and explicit aliases", () => {
    expect(
      parseDietaryResponse(" dairy; PEANUT | Vegan\ncustom medical prose "),
    ).toEqual({
      hasOtherResponse: true,
      tags: ["Milk", "Peanuts", "Vegan"],
    });
    expect(parseDietaryResponse(" ")).toEqual({
      hasOtherResponse: false,
      tags: ["No response recorded"],
    });
    expect(parseDietaryResponse(",,;|")).toEqual({
      hasOtherResponse: true,
      tags: [],
    });
  });
});
