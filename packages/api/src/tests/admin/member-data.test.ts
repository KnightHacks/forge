import { describe, expect, it } from "vitest";

import type { SQL } from "@forge/db";
import { StringChunk } from "@forge/db";

import { rankAdminMemberCandidates } from "../../utils/member/admin";
import {
  graduatedCondition,
  hasGraduated,
} from "../../utils/member/graduation";

function renderCondition(condition: SQL) {
  return condition.queryChunks
    .map((chunk) =>
      chunk instanceof StringChunk
        ? chunk.value.join("")
        : (chunk as { name: string }).name,
    )
    .join("")
    .trim();
}

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

  it("filters graduation off the graduation date, not off alumni confirmation", () => {
    expect(renderCondition(graduatedCondition(true))).toBe(
      "gradDate < CURRENT_DATE",
    );
    expect(renderCondition(graduatedCondition(false))).toBe(
      "gradDate >= CURRENT_DATE",
    );
  });

  it("counts someone graduating today as a current student all day", () => {
    const gradDay = "2026-05-02";

    expect(hasGraduated(gradDay, new Date("2026-05-02T00:00:00.000Z"))).toBe(
      false,
    );
    expect(hasGraduated(gradDay, new Date("2026-05-02T23:59:58.000Z"))).toBe(
      false,
    );
    expect(hasGraduated(gradDay, new Date("2026-05-03T00:00:00.000Z"))).toBe(
      true,
    );
    expect(
      hasGraduated(new Date("2027-05-02T00:00:00.000Z"), new Date(gradDay)),
    ).toBe(false);
  });
});
