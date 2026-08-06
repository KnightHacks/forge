import { describe, expect, it } from "vitest";

import { inspectHackerSdkIntegrity } from "../hacker-sdk/preflight";

describe("Hacker SDK migration preflight", () => {
  it("TC-MIG-002 reports duplicate applications and orphaned identities", () => {
    const report = inspectHackerSdkIntegrity(
      [
        { hackerId: "hacker-a", userExists: true, userId: "user-a" },
        { hackerId: "hacker-b", userExists: true, userId: "user-a" },
        { hackerId: "hacker-c", userExists: false, userId: "missing-user" },
      ],
      [
        { attendeeId: "att-a", hackerId: "hacker-a", hackathonId: "hack-1" },
        { attendeeId: "att-b", hackerId: "hacker-b", hackathonId: "hack-1" },
        { attendeeId: "att-c", hackerId: "hacker-c", hackathonId: "hack-2" },
        {
          attendeeId: "att-d",
          hackerId: "missing-hacker",
          hackathonId: "hack-3",
        },
      ],
    );

    expect(report.canMigrate).toBe(false);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          attendeeIds: ["att-a", "att-b"],
          code: "DUPLICATE_APPLICATION",
          hackathonId: "hack-1",
          userId: "user-a",
        }),
        expect.objectContaining({
          code: "MISSING_USER",
          userId: "missing-user",
        }),
        expect.objectContaining({
          code: "MISSING_HACKER",
          attendeeIds: ["att-d"],
        }),
      ]),
    );
  });

  it("TC-MIG-001 accepts one application per user and hackathon", () => {
    const report = inspectHackerSdkIntegrity(
      [{ hackerId: "hacker-a", userExists: true, userId: "user-a" }],
      [
        { attendeeId: "att-a", hackerId: "hacker-a", hackathonId: "hack-1" },
        { attendeeId: "att-b", hackerId: "hacker-a", hackathonId: "hack-2" },
      ],
    );

    expect(report).toEqual({ canMigrate: true, issues: [] });
  });
});
