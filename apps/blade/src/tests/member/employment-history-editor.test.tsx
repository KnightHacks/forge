import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { EmploymentHistoryEditor } from "~/app/_components/member/employment-history-editor";
import {
  employmentMonthParts,
  employmentMonthValue,
} from "~/app/_components/member/employment-month";

vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: vi.fn(() => ({
      career: {
        searchCompanies: { fetch: vi.fn() },
        searchUsCities: { fetch: vi.fn() },
      },
    })),
  },
}));

const history = [
  {
    cityKey: "12-53000",
    cityLabel: "Orlando, FL",
    companyId: "00000000-0000-4000-8000-000000000001",
    companyLabel: "Knight Hacks",
    draftId: "employment-draft-one",
    endMonth: null,
    experienceType: "full_time" as const,
    guildVisible: true,
    proposedCompanyName: null,
    startMonth: "2025-06",
    state: "current" as const,
    title: "Software Engineer",
  },
  {
    cityKey: null,
    cityLabel: null,
    companyId: "00000000-0000-4000-8000-000000000002",
    companyLabel: "AMD",
    draftId: "employment-draft-two",
    endMonth: null,
    experienceType: null,
    guildVisible: true,
    proposedCompanyName: null,
    startMonth: null,
    state: "unknown" as const,
    title: null,
  },
];

describe("EmploymentHistoryEditor", () => {
  it("TC-001 renders a complete repeatable history and explicit current location", () => {
    const html = renderToStaticMarkup(
      createElement(EmploymentHistoryEditor, {
        currentCityKey: "12-53000",
        currentCityLabel: "Orlando, FL",
        guildLocationVisible: true,
        history,
        onCurrentCityChange: vi.fn(),
        onGuildLocationVisibleChange: vi.fn(),
        onHistoryChange: vi.fn(),
      }),
    );

    expect(html).toContain("Employment history");
    expect(html).toContain("Add experience");
    expect(html).toContain("Current Guild city");
    expect(html).toContain("Orlando, FL");
    expect(html).toContain("Knight Hacks");
    expect(html).toContain("Software Engineer");
    expect(html).toContain("Unconfirmed legacy entry");
    expect(html).toContain("Make this experience public");
    expect(html).toContain('aria-label="Start month: month"');
    expect(html).toContain('aria-label="Start month: year"');
    expect(html).not.toContain('type="month"');
    expect(html).toContain("Move experience up");
    expect(html).toContain("Remove experience");
    expect(html).toContain('data-career-draft-id="employment-draft-one"');
  });

  it("keeps employment months in the canonical wire format", () => {
    expect(employmentMonthParts("2026-05")).toEqual({
      month: "05",
      year: "2026",
    });
    expect(employmentMonthValue("05", "2026")).toBe("2026-05");
    expect(employmentMonthValue("05", "")).toBeNull();
    expect(employmentMonthValue("13", "2026")).toBeNull();
  });
});
