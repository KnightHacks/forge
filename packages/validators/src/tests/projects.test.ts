import { describe, expect, it } from "vitest";

import { projectMemberInputSchema } from "../projects";

describe("project validation", () => {
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
