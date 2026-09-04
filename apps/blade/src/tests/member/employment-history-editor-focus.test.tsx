/** @vitest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import type { CareerHistoryDraft } from "~/app/_components/member/employment-history-editor";
import { EmploymentHistoryEditor } from "~/app/_components/member/employment-history-editor";

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

const history: CareerHistoryDraft[] = [
  {
    cityKey: null,
    cityLabel: null,
    companyId: null,
    companyLabel: "",
    draftId: "draft-one",
    endMonth: null,
    experienceType: "full_time",
    guildVisible: true,
    proposedCompanyName: null,
    startMonth: null,
    state: "current",
    title: "Engineer",
  },
];

const companyIssue = {
  draftId: "draft-one",
  entryIndex: 0,
  field: "company" as const,
  fieldLabel: "Company",
  message: "Choose an existing company or enter a new one.",
};
const scrollIntoView = vi.fn();

beforeAll(() => {
  Element.prototype.scrollIntoView = scrollIntoView;
  window.requestAnimationFrame = (callback) => {
    callback(0);
    return 1;
  };
  window.cancelAnimationFrame = vi.fn();
});

describe("EmploymentHistoryEditor first invalid focus", () => {
  it("focuses and scrolls only when a failed-save request changes", async () => {
    const props = {
      currentCityKey: null,
      currentCityLabel: null,
      guildLocationVisible: true,
      history,
      onCurrentCityChange: vi.fn(),
      onGuildLocationVisibleChange: vi.fn(),
      onHistoryChange: vi.fn(),
      validationIssues: [companyIssue],
    };
    const { rerender } = render(
      <EmploymentHistoryEditor
        {...props}
        focusRequestRevision={0}
        focusTarget={companyIssue}
      />,
    );
    const company = screen.getByRole("textbox", { name: /company/i });

    expect(company).not.toHaveFocus();

    rerender(
      <EmploymentHistoryEditor
        {...props}
        focusRequestRevision={1}
        focusTarget={companyIssue}
      />,
    );

    await waitFor(() => expect(company).toHaveFocus());
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    company.blur();
    rerender(
      <EmploymentHistoryEditor
        {...props}
        focusRequestRevision={1}
        focusTarget={companyIssue}
      />,
    );

    expect(company).not.toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });
});
