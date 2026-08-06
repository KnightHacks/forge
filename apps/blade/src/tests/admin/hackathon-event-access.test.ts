import { describe, expect, it } from "vitest";

import {
  canAccessHackathonEvents,
  canEditHackathonEvents,
} from "~/lib/admin-access";

function permissions(
  patch: Record<string, boolean>,
): Parameters<typeof canAccessHackathonEvents>[0] {
  return {
    CHECKIN_HACK_EVENT: false,
    EDIT_HACK_EVENT: false,
    IS_OFFICER: false,
    READ_HACK_EVENT: false,
    ...patch,
  } as Parameters<typeof canAccessHackathonEvents>[0];
}

describe("hackathon event administration access", () => {
  it("keeps read-only event access out of mutations", () => {
    const readOnly = permissions({ READ_HACK_EVENT: true });
    expect(canAccessHackathonEvents(readOnly)).toBe(true);
    expect(canEditHackathonEvents(readOnly)).toBe(false);
  });

  it("allows event editors and officers to mutate", () => {
    expect(canEditHackathonEvents(permissions({ EDIT_HACK_EVENT: true }))).toBe(
      true,
    );
    expect(canEditHackathonEvents(permissions({ IS_OFFICER: true }))).toBe(
      true,
    );
  });
});
