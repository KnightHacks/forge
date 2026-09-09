import { describe, expect, it } from "vitest";

import {
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
        isScheduled: true,
      };
      expect(schema.parse(input)).not.toHaveProperty("tagColor");
      for (const tagColor of ["#7c3aed", "purple", null]) {
        expect(schema.parse({ ...input, tagColor })).toEqual(
          schema.parse(input),
        );
      }
    }
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
