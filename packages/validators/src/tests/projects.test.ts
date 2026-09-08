import { describe, expect, it } from "vitest";

import {
  judgingGroupCreateSchema,
  judgingGroupUpdateSchema,
  projectMemberInputSchema,
} from "../projects";

describe("project validation", () => {
  it("explains malformed group colors on create and update", () => {
    for (const schema of [judgingGroupCreateSchema, judgingGroupUpdateSchema]) {
      const result = schema.safeParse({
        hackathonId: "00000000-0000-4000-8000-000000000001",
        groupId: "00000000-0000-4000-8000-000000000002",
        label: "General",
        isGeneral: true,
        isScheduled: true,
        tagColor: "purple",
      });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            path: ["tagColor"],
            message: "Use a six-digit hex color, such as #7c3aed.",
          }),
        );
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
