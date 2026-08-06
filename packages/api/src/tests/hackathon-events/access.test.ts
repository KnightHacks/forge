import { describe, expect, it } from "vitest";

import type { PERMISSIONS } from "@forge/consts";

import {
  assertHackathonEvent,
  requireHackathonEventCheckIn,
  requireHackathonEventEdit,
  requireHackathonEventRead,
} from "../../utils/hackathon-events/access";

function actor(...allowed: PERMISSIONS.PermissionKey[]) {
  return {
    session: {
      permissions: Object.fromEntries(
        [
          "IS_OFFICER",
          "READ_HACK_EVENT",
          "EDIT_HACK_EVENT",
          "CHECKIN_HACK_EVENT",
        ].map((key) => [
          key,
          allowed.includes(key as PERMISSIONS.PermissionKey),
        ]),
      ) as Record<PERMISSIONS.PermissionKey, boolean>,
    },
  };
}

describe("hackathon event access", () => {
  it("TC-ACC-001 keeps read, edit, and check-in capabilities independent", () => {
    expect(() =>
      requireHackathonEventRead(actor("READ_HACK_EVENT")),
    ).not.toThrow();
    expect(() =>
      requireHackathonEventRead(actor("EDIT_HACK_EVENT")),
    ).not.toThrow();
    expect(() => requireHackathonEventEdit(actor("READ_HACK_EVENT"))).toThrow();
    expect(() =>
      requireHackathonEventCheckIn(actor("EDIT_HACK_EVENT")),
    ).toThrow();
    expect(() =>
      requireHackathonEventCheckIn(actor("CHECKIN_HACK_EVENT")),
    ).not.toThrow();
  });

  it("TC-ACC-001 preserves the officer override", () => {
    const officer = actor("IS_OFFICER");
    expect(() => requireHackathonEventRead(officer)).not.toThrow();
    expect(() => requireHackathonEventEdit(officer)).not.toThrow();
    expect(() => requireHackathonEventCheckIn(officer)).not.toThrow();
  });

  it("TC-ACC-002 refuses Club and cross-hack records as not found", () => {
    expect(() =>
      assertHackathonEvent({ hackathonId: null }, "hack-a"),
    ).toThrowError("Event not found.");
    expect(() =>
      assertHackathonEvent({ hackathonId: "hack-b" }, "hack-a"),
    ).toThrowError("Event not found.");
    expect(
      assertHackathonEvent({ hackathonId: "hack-a", id: "event-a" }, "hack-a"),
    ).toMatchObject({ id: "event-a" });
  });
});
