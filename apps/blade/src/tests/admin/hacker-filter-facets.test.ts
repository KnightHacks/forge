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

  it("sends nothing at all when nothing moved", () => {
    const seed = {
      graduationTerms: ["Fall" as const],
      schools: ["University of Central Florida"],
    };
    expect(changedFacets(seed, { ...seed })).toEqual({});
  });
});
