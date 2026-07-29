import { describe, expect, it } from "vitest";

import { draftAvailability } from "~/app/_components/admin/forms/form-availability-draft";

const sections = [
  { id: "section-1", name: "General" },
  { id: "section-2", name: "Recruiting" },
];

describe("form availability draft", () => {
  it("opens a new form locked to one response and open to everyone", () => {
    const draft = draftAvailability(undefined, sections);

    expect(draft).toEqual({
      closesAt: "",
      duesOnly: false,
      manuallyClosed: false,
      opensAt: "",
      respondentRoleIds: [],
      responseMode: "single_locked",
      sectionId: "section-1",
    });
  });

  it("leaves the section empty when the author can post to none", () => {
    expect(draftAvailability(undefined, []).sectionId).toBe("");
  });

  it("seeds every setting from the saved form", () => {
    const draft = draftAvailability(
      {
        closesAt: "2026-09-01T12:00:00.000Z",
        duesOnly: true,
        manuallyClosed: true,
        opensAt: "2026-08-01T12:00:00.000Z",
        respondentRoleIds: ["role-1", "role-2"],
        responseMode: "multiple_locked",
        sectionId: "section-2",
      },
      sections,
    );

    expect(draft.duesOnly).toBe(true);
    expect(draft.manuallyClosed).toBe(true);
    expect(draft.respondentRoleIds).toEqual(["role-1", "role-2"]);
    expect(draft.responseMode).toBe("multiple_locked");
    expect(draft.sectionId).toBe("section-2");
  });

  // The inputs are `datetime-local`, so the draft holds a zoneless wall-clock
  // string. Asserting the instant it parses back to keeps the test true in
  // whatever zone it runs, which is the property that actually matters: the
  // author sees their own clock and saves the instant they were shown.
  it("shows saved timestamps on the viewer's own clock", () => {
    const draft = draftAvailability(
      {
        closesAt: "2026-09-01T12:00:00.000Z",
        duesOnly: false,
        manuallyClosed: false,
        opensAt: "2026-08-01T12:00:00.000Z",
        respondentRoleIds: [],
        responseMode: "single_locked",
        sectionId: "section-2",
      },
      sections,
    );

    expect(draft.opensAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(new Date(draft.opensAt).toISOString()).toBe(
      "2026-08-01T12:00:00.000Z",
    );
    expect(new Date(draft.closesAt).toISOString()).toBe(
      "2026-09-01T12:00:00.000Z",
    );
  });
});
