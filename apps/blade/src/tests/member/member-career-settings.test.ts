import { describe, expect, it } from "vitest";

import type { RouterOutputs } from "@forge/api";

import type { CareerHistoryDraft } from "~/app/_components/member/employment-history-editor";
import type { CareerSettingsState } from "~/app/_components/member/member-career-settings";
import {
  careerHistoryFirstIssueSummary,
  careerHistoryMutationInput,
  careerSaveErrorMessage,
  careerSettingsStateFromCareerData,
  hasCareerSettingsChanged,
  validateCareerHistory,
} from "~/app/_components/member/member-career-settings";

type CareerData = RouterOutputs["career"]["listMyEmployment"];

function draft(overrides: Partial<CareerHistoryDraft> = {}) {
  return {
    cityKey: "12-34567",
    cityLabel: "Orlando, FL",
    companyId: "11111111-1111-4111-8111-111111111111",
    companyLabel: "Knight Hacks",
    draftId: "draft-1",
    endMonth: null,
    experienceType: "full_time",
    guildVisible: true,
    proposedCompanyName: null,
    startMonth: "2024-01",
    state: "current",
    title: "Engineer",
    ...overrides,
  } satisfies CareerHistoryDraft;
}

function state(overrides: Partial<CareerSettingsState> = {}) {
  return {
    currentCityKey: "12-34567",
    currentCityLabel: "Orlando, FL",
    guildLocationVisible: true,
    history: [draft()],
    ...overrides,
  } satisfies CareerSettingsState;
}

describe("careerSettingsStateFromCareerData", () => {
  const careerData = {
    currentLocation: {
      city: { key: "12-34567", label: "Orlando, FL" },
      currentCityKey: "12-34567",
      guildLocationVisible: false,
    },
    employment: [
      {
        cityKey: "12-34567",
        city: { key: "12-34567", label: "Orlando, FL" },
        company: { id: "company-1", displayName: "Knight Hacks" },
        endMonth: null,
        experienceType: "full_time",
        guildVisible: true,
        id: "employment-1",
        startMonth: "2024-01",
        state: "current",
        title: "Engineer",
      },
      {
        cityKey: null,
        city: null,
        company: { id: "company-2", displayName: "Legacy Co" },
        endMonth: "2023-08",
        experienceType: null,
        guildVisible: false,
        id: "employment-2",
        startMonth: null,
        state: "unknown",
        title: null,
      },
    ],
  } as unknown as CareerData;

  it("carries the saved location through unchanged", () => {
    const initial = careerSettingsStateFromCareerData(careerData);

    expect(initial.currentCityKey).toBe("12-34567");
    expect(initial.currentCityLabel).toBe("Orlando, FL");
    expect(initial.guildLocationVisible).toBe(false);
  });

  it("reuses the saved row id as the draft id so untouched rows keep identity", () => {
    const initial = careerSettingsStateFromCareerData(careerData);

    expect(initial.history.map((entry) => entry.draftId)).toEqual([
      "employment-1",
      "employment-2",
    ]);
  });

  it("flattens the joined company and city onto the draft", () => {
    const [first] = careerSettingsStateFromCareerData(careerData).history;

    expect(first?.companyId).toBe("company-1");
    expect(first?.companyLabel).toBe("Knight Hacks");
    expect(first?.cityLabel).toBe("Orlando, FL");
  });

  it("falls back to a null city label when the row has no joined city", () => {
    const [, second] = careerSettingsStateFromCareerData(careerData).history;

    expect(second?.cityKey).toBeNull();
    expect(second?.cityLabel).toBeNull();
  });

  it("preserves the unconfirmed legacy shape instead of defaulting it", () => {
    const [, second] = careerSettingsStateFromCareerData(careerData).history;

    expect(second?.state).toBe("unknown");
    expect(second?.experienceType).toBeNull();
    expect(second?.title).toBeNull();
  });

  it("always seeds proposedCompanyName as null, since saved rows are linked", () => {
    const initial = careerSettingsStateFromCareerData(careerData);

    expect(
      initial.history.every((entry) => entry.proposedCompanyName === null),
    ).toBe(true);
  });

  it("returns an empty history for a member with no employment", () => {
    const initial = careerSettingsStateFromCareerData({
      currentLocation: {
        city: null,
        currentCityKey: null,
        guildLocationVisible: true,
      },
      employment: [],
    } as unknown as CareerData);

    expect(initial.history).toEqual([]);
    expect(initial.currentCityKey).toBeNull();
    expect(initial.currentCityLabel).toBeNull();
  });
});

describe("hasCareerSettingsChanged", () => {
  it("reports no change for an untouched copy", () => {
    expect(hasCareerSettingsChanged(state(), state())).toBe(false);
  });

  it("ignores display-only fields, which never reach the server", () => {
    const relabelled = state({
      currentCityLabel: "Orlando, Florida",
      history: [
        draft({
          cityLabel: "Orlando, Florida",
          companyLabel: "Knight Hacks Inc.",
          draftId: "draft-regenerated",
        }),
      ],
    });

    expect(hasCareerSettingsChanged(relabelled, state())).toBe(false);
  });

  it("detects a changed city key", () => {
    expect(
      hasCareerSettingsChanged(state({ currentCityKey: "12-99999" }), state()),
    ).toBe(true);
  });

  it("detects a toggled location visibility", () => {
    expect(
      hasCareerSettingsChanged(state({ guildLocationVisible: false }), state()),
    ).toBe(true);
  });

  it("detects an edited employment field", () => {
    expect(
      hasCareerSettingsChanged(
        state({ history: [draft({ title: "Senior Engineer" })] }),
        state(),
      ),
    ).toBe(true);
  });

  it("detects an added and a removed entry", () => {
    expect(
      hasCareerSettingsChanged(
        state({ history: [draft(), draft({ draftId: "draft-2" })] }),
        state(),
      ),
    ).toBe(true);
    expect(hasCareerSettingsChanged(state({ history: [] }), state())).toBe(
      true,
    );
  });

  it("treats a reorder as a change, because order is persisted", () => {
    const first = draft({ draftId: "draft-1", title: "Engineer" });
    const second = draft({ draftId: "draft-2", title: "Intern" });

    expect(
      hasCareerSettingsChanged(
        state({ history: [second, first] }),
        state({ history: [first, second] }),
      ),
    ).toBe(true);
  });
});

describe("validateCareerHistory", () => {
  it("identifies the exact entry and field for a missing position title", () => {
    expect(
      validateCareerHistory([
        draft(),
        draft({ draftId: "draft-2", title: null }),
      ]),
    ).toEqual({
      issues: [
        {
          draftId: "draft-2",
          entryIndex: 1,
          field: "title",
          fieldLabel: "Position title",
          message: "Enter a position title.",
        },
      ],
      legacyDraftIds: [],
    });
  });

  it("maps missing current-entry fields without calling them legacy", () => {
    const result = validateCareerHistory([
      draft({
        companyId: null,
        companyLabel: "",
        draftId: "missing-company",
        proposedCompanyName: null,
      }),
      draft({ draftId: "missing-title", title: null }),
      draft({ draftId: "missing-type", experienceType: null }),
    ]);

    expect(result.issues).toEqual([
      {
        draftId: "missing-company",
        entryIndex: 0,
        field: "company",
        fieldLabel: "Company",
        message: "Choose an existing company or enter a new one.",
      },
      {
        draftId: "missing-title",
        entryIndex: 1,
        field: "title",
        fieldLabel: "Position title",
        message: "Enter a position title.",
      },
      {
        draftId: "missing-type",
        entryIndex: 2,
        field: "experienceType",
        fieldLabel: "Experience type",
        message: "Choose an experience type.",
      },
    ]);
    expect(result.legacyDraftIds).toEqual([]);
  });

  it("marks only an actually unconfirmed state as a legacy entry", () => {
    const result = validateCareerHistory([
      draft({
        draftId: "legacy-entry",
        experienceType: null,
        state: "unknown",
      }),
      draft({ draftId: "current-entry", experienceType: null }),
    ]);

    expect(result.legacyDraftIds).toEqual(["legacy-entry"]);
    expect(result.issues).toContainEqual({
      draftId: "legacy-entry",
      entryIndex: 0,
      field: "state",
      fieldLabel: "Employment status",
      message: "Choose whether this employment is current or former.",
    });
    expect(result.issues).toContainEqual({
      draftId: "current-entry",
      entryIndex: 1,
      field: "experienceType",
      fieldLabel: "Experience type",
      message: "Choose an experience type.",
    });
  });

  it("summarizes only the first issue with its entry and field", () => {
    const result = validateCareerHistory([
      draft({ companyId: null, proposedCompanyName: null, title: null }),
    ]);

    expect(careerHistoryFirstIssueSummary(result)).toBe(
      "Employment entry 1, Company: Choose an existing company or enter a new one.",
    );
  });
});

describe("careerHistoryMutationInput", () => {
  it("drops the display-only fields the mutation does not accept", () => {
    const [entry] = careerHistoryMutationInput([draft()]);

    expect(entry).not.toHaveProperty("cityLabel");
    expect(entry).not.toHaveProperty("companyLabel");
    expect(entry).not.toHaveProperty("draftId");
  });

  it("keeps the persisted fields as entered", () => {
    const [entry] = careerHistoryMutationInput([
      draft({ endMonth: "2025-06", guildVisible: false, state: "past" }),
    ]);

    expect(entry).toEqual({
      cityKey: "12-34567",
      companyId: "11111111-1111-4111-8111-111111111111",
      endMonth: "2025-06",
      experienceType: "full_time",
      guildVisible: false,
      proposedCompanyName: null,
      startMonth: "2024-01",
      state: "past",
      title: "Engineer",
    });
  });

  it("sends an empty title rather than null", () => {
    const [entry] = careerHistoryMutationInput([draft({ title: null })]);

    expect(entry?.title).toBe("");
  });

  it("preserves order", () => {
    expect(
      careerHistoryMutationInput([
        draft({ title: "First" }),
        draft({ title: "Second" }),
      ]).map((entry) => entry.title),
    ).toEqual(["First", "Second"]);
  });

  it("returns an empty array for an empty history", () => {
    expect(careerHistoryMutationInput([])).toEqual([]);
  });

  it("throws when an entry has no experience type", () => {
    expect(() =>
      careerHistoryMutationInput([draft({ experienceType: null })]),
    ).toThrow("Choose an experience type.");
  });

  // `validateCareerHistory` is the guard for this; the narrowing cast here
  // would otherwise send "unknown" to a mutation that rejects it.
  it("does not itself reject an unconfirmed state", () => {
    expect(() =>
      careerHistoryMutationInput([draft({ state: "unknown" })]),
    ).not.toThrow();
  });
});

describe("careerSaveErrorMessage", () => {
  it("extracts the actionable message from a serialized Zod issue array", () => {
    expect(
      careerSaveErrorMessage(
        new Error(
          JSON.stringify([
            {
              code: "invalid_format",
              message: "Use a valid month and year.",
              path: [0, "startMonth"],
            },
          ]),
        ),
      ),
    ).toBe("Use a valid month and year.");
  });

  it("keeps an ordinary server message and hides non-issue JSON", () => {
    expect(careerSaveErrorMessage(new Error("Company was not found."))).toBe(
      "Company was not found.",
    );
    expect(careerSaveErrorMessage(new Error('{"unexpected":true}'))).toBe(
      "Career history could not be saved.",
    );
  });
});
