import { describe, expect, it } from "vitest";

import { changedFacets } from "~/app/_components/admin/hackathon/hackers/hacker-filters";

/**
 * What the Filters panel sends when Apply is pressed.
 *
 * The panel seeds a draft from `url.filter`, which does not update until the
 * server responds — so a panel opened during a navigation holds a stale copy.
 * Sending every facet unconditionally made Apply a `{...snapshot, oneChange}`
 * write wearing a patch's clothes: remove a school chip, open the panel inside
 * that window, tick something unrelated, Apply, and the chip came back. With a
 * selection live it was worse, because the consent dialog then described the
 * resurrected filter accurately and applying it was the officer's own click.
 *
 * Diffing against the seed is the fix, so these are the cases that matter.
 */
describe("changedFacets", () => {
  it("omits a facet the officer never touched", () => {
    const seed = { schools: ["University of Central Florida"] };
    const draft = {
      levelsOfStudy: ["Undergraduate University (3+ year)"],
      schools: ["University of Central Florida"],
    };

    // `schools` absent means "leave it alone", so a removal that landed while
    // the panel was open survives.
    expect(changedFacets(seed, draft)).toEqual({
      levelsOfStudy: ["Undergraduate University (3+ year)"],
    });
  });

  it("sends an emptied facet so it can be cleared", () => {
    const patch = changedFacets(
      { schools: ["University of Central Florida"] },
      {
        schools: [],
      },
    );

    // Present-and-empty is how a patch says "clear this" — distinct from absent.
    expect("schools" in patch).toBe(true);
    expect(patch.schools).toEqual([]);
  });

  it("treats a re-ticked value as untouched", () => {
    // The multi-select appends, so unticking and re-ticking yields the same set
    // in a different order. Sending it would cost a navigation and, with a
    // selection live, a survival round trip for a change that is not one.
    const both = [
      "University of Central Florida",
      "University of South Florida",
    ];
    expect(
      changedFacets({ schools: both }, { schools: [...both].reverse() }),
    ).toEqual({});
  });

  it("does not confuse unset with empty", () => {
    // Ticking then unticking a facet that started unset is a round trip back to
    // where it began.
    expect(changedFacets({}, { schools: [] })).toEqual({});
  });

  it("carries the blacklist toggle in both directions", () => {
    expect(changedFacets({}, { blacklisted: true })).toEqual({
      blacklisted: true,
    });
    const cleared = changedFacets({ blacklisted: true }, {});
    expect("blacklisted" in cleared).toBe(true);
    expect(cleared.blacklisted).toBeUndefined();
  });

  it("compares graduation years by value, not by type", () => {
    expect(
      changedFacets({ graduationYears: [2027] }, { graduationYears: [2027] }),
    ).toEqual({});
    expect(
      changedFacets({ graduationYears: [2027] }, { graduationYears: [2028] }),
    ).toEqual({ graduationYears: [2028] });
  });

  // Every facet the panel offers, not just the ones that happened to exist when
  // this helper was first written — those were silently omitted and the filters
  // did nothing at all.
  it.each([
    ["majors", ["Computer Science"]],
    ["racesOrEthnicities", ["Prefer not to answer"]],
    ["genders", ["Prefer not to answer"]],
    ["shirtSizes", ["M"]],
    ["schools", ["University of Central Florida"]],
    ["levelsOfStudy", ["Undergraduate University (3+ year)"]],
  ] as const)("sends %s when it changes", (field, value) => {
    const patch = changedFacets({}, { [field]: value });
    expect(patch).toEqual({ [field]: value });
  });

  it("sends every tri-state facet, including false", () => {
    // `false` is a real choice for these, unlike the other booleans where it
    // means "not applied".
    expect(changedFacets({}, { isFirstTime: true })).toEqual({
      isFirstTime: true,
    });
    expect(
      changedFacets({ isFirstTime: true }, { isFirstTime: false }),
    ).toEqual({ isFirstTime: false });
    expect(changedFacets({}, { firstTimeStatus: "unknown" })).toEqual({
      firstTimeStatus: "unknown",
    });
  });

  it("sends the age range and the dietary toggle", () => {
    expect(changedFacets({}, { ageMin: 18 })).toEqual({ ageMin: 18 });
    expect(changedFacets({}, { hasDietaryNeeds: false })).toEqual({
      hasDietaryNeeds: false,
    });
  });

  it("sends nothing at all when nothing moved", () => {
    const seed = {
      graduationTerms: ["Fall" as const],
      schools: ["University of Central Florida"],
    };
    expect(changedFacets(seed, { ...seed })).toEqual({});
  });
});
