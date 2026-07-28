import { describe, expect, it } from "vitest";

import { roleManagementQuerySchema } from "@forge/validators";

import { rankCheckInIdentityCandidates } from "../../utils/events/discovery";
import { rankAdminMemberCandidates } from "../../utils/member/admin";
import { filterRoleUsers } from "../../utils/roles/management";
import {
  normalizeSearchValue,
  scoreSearchCandidate,
} from "../../utils/search-ranking";

/**
 * One fixture, one query, exercised through all three admin screens.
 *
 * Against the query "al" each person sits on a different rung, and the four
 * matching rungs are deliberately adjacent so that dropping any one of them
 * changes the order:
 *
 * - Al Ramirez     — "al" is a whole word            (950)
 * - Alice Nguyen   — "al" opens the primary name     (900)
 * - Aaron Alvarez  — "al" opens a later word         (850)
 * - Kai Halstead   — "al" appears inside a word      (800)
 * - Zoe Ruiz       — no match at all                 (dropped)
 *
 * Aaron sorts before Alice on every screen's name tiebreaker, so if the 900
 * rung were missing the two would tie at 850 and Aaron would surface first.
 * That is exactly the divergence this fixture exists to catch.
 */
const PEOPLE = [
  {
    discord: "ramirez",
    email: "ramirez@knighthacks.test",
    firstName: "Al",
    key: "exact-word",
    lastName: "Ramirez",
  },
  {
    discord: "nguyen",
    email: "nguyen@knighthacks.test",
    firstName: "Alice",
    key: "text-prefix",
    lastName: "Nguyen",
  },
  {
    discord: "aaron",
    email: "aaron@knighthacks.test",
    firstName: "Aaron",
    key: "word-prefix",
    lastName: "Alvarez",
  },
  {
    discord: "kai",
    email: "kai@knighthacks.test",
    firstName: "Kai",
    key: "substring",
    lastName: "Halstead",
  },
  {
    discord: "zoe",
    email: "zoe@knighthacks.test",
    firstName: "Zoe",
    key: "no-match",
    lastName: "Ruiz",
  },
] as const;

const EXPECTED_ORDER = [
  "exact-word",
  "text-prefix",
  "word-prefix",
  "substring",
];

function personId(index: number) {
  return `00000000-0000-4000-8000-00000000000${index + 1}`;
}

describe("search ranking ladder", () => {
  it("scores each rung above the next and drops non-matches", () => {
    const searchable = "alice nguyen alice nguyen nguyen knighthacks test";

    expect(scoreSearchCandidate("al", "al")).toBe(1_000);
    expect(scoreSearchCandidate("nguyen al", "al")).toBe(950);
    expect(scoreSearchCandidate(searchable, "al")).toBe(900);
    expect(scoreSearchCandidate("aaron alvarez", "al")).toBe(850);
    expect(scoreSearchCandidate("kai halstead", "al")).toBe(800);
    expect(scoreSearchCandidate("zoe ruiz", "al")).toBeNull();
  });

  it("charges an edit-distance penalty that stays below every literal rung", () => {
    expect(scoreSearchCandidate("alice nguyen", "alise")).toBe(550);
    expect(scoreSearchCandidate("alice nguyen", "alose")).toBe(500);
    expect(scoreSearchCandidate("alice nguyen", "alosa")).toBeNull();
  });

  it("allows only one typo in a short token", () => {
    expect(scoreSearchCandidate("kai halstead", "koi")).toBe(550);
    expect(scoreSearchCandidate("kai halstead", "koe")).toBeNull();
  });

  it("requires every query token to match and ignores token order", () => {
    const searchable = "alice nguyen alice nguyen nguyen knighthacks test";

    expect(scoreSearchCandidate(searchable, "alice nguyen")).toBe(1_900);
    expect(scoreSearchCandidate(searchable, "nguyen alice")).toBe(1_900);
    expect(scoreSearchCandidate(searchable, "alice ramirez")).toBeNull();
  });

  it("folds diacritics, case, and punctuation before comparing", () => {
    expect(normalizeSearchValue("  Álîcé---Nguyễn  ")).toBe("alice nguyen");
    expect(scoreSearchCandidate("Álîcé Nguyễn", "ALICE---NGUYEN")).toBe(1_900);
  });

  it("treats an empty query as a tie rather than a filter", () => {
    expect(scoreSearchCandidate("alice nguyen", "")).toBe(0);
    expect(scoreSearchCandidate("alice nguyen", "   ---   ")).toBe(0);
  });
});

describe("admin screens share one ranking order", () => {
  it("orders the admin members screen by rung", () => {
    const ranked = rankAdminMemberCandidates(
      PEOPLE.map((person) => ({
        company: null,
        discordUser: person.discord,
        email: person.email,
        firstName: person.firstName,
        id: person.key,
        lastName: person.lastName,
        school: "Rollins",
      })),
      "al",
    );

    expect(ranked.map(({ candidate }) => candidate.id)).toEqual(EXPECTED_ORDER);
  });

  it("orders the role assignment screen by rung", () => {
    const input = roleManagementQuerySchema.parse({
      page: 1,
      pageSize: 25,
      userQuery: "al",
      userRoleIds: [],
      view: "assignments",
    });
    const result = filterRoleUsers(
      PEOPLE.map((person, index) => ({
        discordUserId: `10000000000000000${index}`,
        email: person.email,
        id: personId(index),
        memberName: `${person.firstName} ${person.lastName}`,
        name: person.discord,
        roleIds: [],
      })),
      input,
    );

    expect(result.users.map((user) => user.memberName)).toEqual([
      "Al Ramirez",
      "Alice Nguyen",
      "Aaron Alvarez",
      "Kai Halstead",
    ]);
    expect(result.pagination.totalCount).toBe(4);
  });

  it("orders the check-in screen by rung", () => {
    const ranked = rankCheckInIdentityCandidates(
      PEOPLE.map((person, index) => ({
        discordUsername: person.discord,
        email: person.email,
        firstName: person.firstName,
        lastName: person.lastName,
        memberId: person.key,
        userId: personId(index),
      })),
      { limit: 10, query: "al" },
    );

    expect(ranked.map((candidate) => candidate.memberId)).toEqual(
      EXPECTED_ORDER,
    );
  });

  it("keeps check-in's literal-match filter ahead of typo tolerance", () => {
    const ranked = rankCheckInIdentityCandidates(
      [
        {
          discordUsername: "aliceng",
          email: "alice@knighthacks.test",
          firstName: "Alice",
          lastName: "Nguyen",
          memberId: "literal",
          userId: personId(0),
        },
        {
          discordUsername: "alise",
          email: "alise@knighthacks.test",
          firstName: "Alise",
          lastName: "Barron",
          memberId: "typo",
          userId: personId(1),
        },
      ],
      { limit: 10, query: "alice" },
    );

    expect(ranked.map((candidate) => candidate.memberId)).toEqual(["literal"]);
  });
});
