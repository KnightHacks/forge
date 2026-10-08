import { describe, expect, it } from "vitest";

import {
  judgingChallengeModeSchema,
  judgingGroupCreateSchema,
  judgingGroupUpdateSchema,
  projectMemberInputSchema,
} from "../projects";

describe("project validation", () => {
  it("strips custom group colors from create and update inputs", () => {
    for (const schema of [judgingGroupCreateSchema, judgingGroupUpdateSchema]) {
      const input = {
        hackathonId: "00000000-0000-4000-8000-000000000001",
        groupId: "00000000-0000-4000-8000-000000000002",
        label: "General",
        isGeneral: true,
        judgingMode: "scheduled",
      };
      expect(schema.parse(input)).not.toHaveProperty("tagColor");
      for (const tagColor of ["#7c3aed", "purple", null]) {
        expect(schema.parse({ ...input, tagColor })).toEqual(
          schema.parse(input),
        );
      }
    }
  });
  it("accepts only the three judging challenge modes", () => {
    for (const mode of ["scheduled", "unscheduled", "remote"])
      expect(judgingChallengeModeSchema.parse(mode)).toBe(mode);
    expect(judgingChallengeModeSchema.safeParse("hidden").success).toBe(false);
  });
  it("requires a valid email for every editable team member", () => {
    expect(
      projectMemberInputSchema.safeParse({ email: "", name: "Casey" }).success,
    ).toBe(false);
    expect(
      projectMemberInputSchema.safeParse({
        email: "not-an-email",
        name: "Casey",
      }).success,
    ).toBe(false);
    expect(
      projectMemberInputSchema.parse({
        email: " casey@example.test ",
        name: "Casey",
      }),
    ).toEqual({ email: "casey@example.test", name: "Casey" });
  });
});
