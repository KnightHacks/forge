import { describe, expect, it } from "vitest";

import {
  auditIdentityParams,
  mergeAuditOptions,
} from "~/app/_components/admin/logs/admin-log-options";

describe("admin log server option seeding", () => {
  it("retains valid deep-linked identities and ignores malformed ones", () => {
    expect(
      auditIdentityParams({
        actor: "00000000-0000-4000-8000-000000000001",
        hacker: "not-a-uuid",
        member: ["00000000-0000-4000-8000-000000000002", "ignored"],
      }),
    ).toEqual({
      actorUserId: "00000000-0000-4000-8000-000000000001",
      hackerAttendeeId: null,
      memberId: "00000000-0000-4000-8000-000000000002",
    });
  });

  it("adds selected identities outside the default seed without duplicates", () => {
    expect(
      mergeAuditOptions(
        [{ id: "first" }],
        [{ id: "selected" }, { id: "first" }],
        (item) => item.id,
      ),
    ).toEqual([{ id: "first" }, { id: "selected" }]);
  });
});
