import { describe, expect, it } from "vitest";

import { matchAlertMemberIds } from "../../utils/job-board/alert-matching";

const internship = { companyKey: "google", track: "internship" } as const;
const google = {
  memberId: "member",
  track: "internship",
  kind: "company",
  targetKey: "google",
  customValue: null,
} as const;
const orlando = {
  memberId: "member",
  track: "internship",
  kind: "location",
  targetKey: "12-53000",
  customValue: null,
} as const;
const orlandoLocation = {
  kind: "city",
  cityKey: "12-53000",
  sourceText: "Orlando, FL",
} as const;
const seattleLocation = {
  kind: "city",
  cityKey: "53-63000",
  sourceText: "Seattle, WA",
} as const;

describe("matchAlertMemberIds", () => {
  it("matches either preference on the job's track, once per member (M1)", () => {
    const preferences = [google, orlando];
    const otherCompany = { ...internship, companyKey: "acme" };

    expect(
      matchAlertMemberIds(internship, [seattleLocation], preferences),
    ).toEqual(["member"]);
    expect(
      matchAlertMemberIds(otherCompany, [orlandoLocation], preferences),
    ).toEqual(["member"]);
    expect(
      matchAlertMemberIds(internship, [orlandoLocation], preferences),
    ).toEqual(["member"]);
    expect(
      matchAlertMemberIds(otherCompany, [seattleLocation], preferences),
    ).toEqual([]);
    expect(
      matchAlertMemberIds(
        { ...internship, track: "new_grad" },
        [orlandoLocation],
        preferences,
      ),
    ).toEqual([]);
    expect(matchAlertMemberIds(internship, [orlandoLocation], [])).toEqual([]);
  });

  it("uses the normalized key for a custom company (M2)", () => {
    const preference = { ...google, customValue: "GOOGLE!" };

    expect(matchAlertMemberIds(internship, [], [preference])).toEqual([
      "member",
    ]);
  });

  it("checks each parsed city and requires an explicit U.S. remote location (M2)", () => {
    const remote = { ...orlando, memberId: "remote", targetKey: "remote_us" };
    const unknownRemote = {
      kind: "unknown",
      cityKey: null,
      sourceText: "Remote",
    } as const;

    expect(
      matchAlertMemberIds(
        internship,
        [seattleLocation, unknownRemote, orlandoLocation],
        [orlando, remote],
      ),
    ).toEqual(["member"]);
    expect(
      matchAlertMemberIds(
        internship,
        [{ kind: "remote_us", cityKey: null, sourceText: "Remote, U.S." }],
        [orlando, remote],
      ),
    ).toEqual(["remote"]);
  });

  it("matches a custom location as a whole phrase, even in unknown text (M2)", () => {
    const location = {
      kind: "unknown",
      cityKey: null,
      sourceText: "Hybrid — Greater Bay-Area / Atlanta",
    } as const;
    const bayArea = {
      ...orlando,
      targetKey: "bay area",
      customValue: "Bay Area",
    };
    const la = {
      ...orlando,
      memberId: "la",
      targetKey: "la",
      customValue: "LA",
    };

    expect(matchAlertMemberIds(internship, [location], [bayArea, la])).toEqual([
      "member",
    ]);
    expect(
      matchAlertMemberIds(
        internship,
        [{ ...location, sourceText: "Office near Orlando, FL" }],
        [orlando],
      ),
    ).toEqual([]);
  });
});
