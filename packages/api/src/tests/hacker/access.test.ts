import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@forge/auth/server";
import type { PERMISSIONS } from "@forge/consts";

import { permissionBitstring } from "../support/permissions";

/**
 * Same harness as the hackathon configuration access test, and for the same
 * reason: every database entry point except `select` throws, so a procedure
 * that reads before it checks fails loudly rather than passing quietly.
 *
 * `select` cannot throw — the permission lookup needs it — so for the read
 * procedures the proof is the call count instead: exactly one `select`, the
 * permission lookup, and no data read.
 */
const mocks = vi.hoisted(() => {
  const forbidden = (entry: string) => () => {
    throw new Error(
      `Procedure reached db.${entry} before its permission check.`,
    );
  };
  return {
    db: {
      delete: forbidden("delete"),
      insert: forbidden("insert"),
      query: new Proxy(
        {},
        {
          get(_target, table) {
            throw new Error(
              `Procedure reached db.query.${String(table)} before its permission check.`,
            );
          },
        },
      ),
      select: vi.fn(),
      transaction: forbidden("transaction"),
      update: forbidden("update"),
    },
    permissionRows: [] as { permissions: string }[],
  };
});

vi.mock("@forge/db/client", () => ({ db: mocks.db }));

const { hackerRouter } = await import("../../routers/hacker");
const { createCallerFactory } = await import("../../trpc");

const callerFactory = createCallerFactory(hackerRouter);

const SESSION = {
  user: { id: "00000000-0000-4000-8000-000000000001", name: "hacker-test" },
} as Session;

function createCaller(session: Session | null = SESSION) {
  return callerFactory({
    headers: new Headers(),
    session,
    source: "hacker-access-test",
  });
}

type Caller = ReturnType<typeof createCaller>;

const HACKATHON_ID = "00000000-0000-4000-8000-0000000000aa";
const ATTENDEE_ID = "00000000-0000-4000-8000-0000000000dd";

/** Every procedure the router exposes, with input its schema accepts. */
const PROCEDURES: [string, (caller: Caller) => Promise<unknown>][] = [
  ["listHackathonOptions", (caller) => caller.listHackathonOptions()],
  ["get", (caller) => caller.get({ attendeeId: ATTENDEE_ID })],
  [
    "filterOptions",
    (caller) => caller.filterOptions({ hackathonId: HACKATHON_ID }),
  ],
  [
    "listForHackathon",
    (caller) => caller.listForHackathon({ hackathonId: HACKATHON_ID }),
  ],
  [
    "statusCounts",
    (caller) => caller.statusCounts({ hackathonId: HACKATHON_ID }),
  ],
  [
    "selectionSurvival",
    (caller) =>
      caller.selectionSurvival({
        attendeeIds: [ATTENDEE_ID],
        hackathonId: HACKATHON_ID,
      }),
  ],
  [
    "setStatus",
    (caller) =>
      caller.setStatus({ attendeeId: ATTENDEE_ID, status: "accepted" }),
  ],
  [
    "previewBulk",
    (caller) =>
      caller.previewBulk({
        attendeeIds: [ATTENDEE_ID],
        hackathonId: HACKATHON_ID,
        status: "accepted",
      }),
  ],
  [
    "confirmBulk",
    (caller) =>
      caller.confirmBulk({
        attendeeIds: [ATTENDEE_ID],
        hackathonId: HACKATHON_ID,
        status: "accepted",
      }),
  ],
  [
    "deleteApplication",
    (caller) =>
      caller.deleteApplication({ attendeeId: ATTENDEE_ID, confirmed: true }),
  ],
  [
    "setBlacklist",
    (caller) =>
      caller.setBlacklist({
        attendeeId: ATTENDEE_ID,
        blacklisted: true,
        reason: "Repeated code of conduct violations.",
      }),
  ],
  [
    "awardPoints",
    (caller) =>
      caller.awardPoints({
        attendeeId: ATTENDEE_ID,
        delta: 10,
        reason: "Won the hardware challenge.",
      }),
  ],
  [
    "updateProfile",
    (caller) =>
      caller.updateProfile({
        attendeeId: ATTENDEE_ID,
        phoneNumber: "4075550100",
      }),
  ],
];

describe("hacker management access policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.permissionRows = [];
    mocks.db.select.mockImplementation(() => ({
      from: () => ({
        innerJoin: () => ({
          where: () => Promise.resolve(mocks.permissionRows),
        }),
      }),
    }));
  });

  it("exposes exactly the documented procedures", () => {
    // A procedure added without an access decision fails here before review.
    expect(Object.keys(hackerRouter._def.procedures).sort()).toEqual(
      PROCEDURES.map(([name]) => name).sort(),
    );
  });

  describe("TC-NEG-001: unauthenticated", () => {
    it.each(PROCEDURES)(
      "%s rejects a caller with no session, before loading permissions",
      async (_name, call) => {
        await expect(call(createCaller(null))).rejects.toMatchObject({
          code: "UNAUTHORIZED",
        });
        expect(mocks.db.select).not.toHaveBeenCalled();
      },
    );
  });

  const reads = new Set([
    "listHackathonOptions",
    "get",
    "filterOptions",
    "listForHackathon",
    "statusCounts",
    "selectionSurvival",
  ]);
  const actors: { label: string; keys: PERMISSIONS.PermissionKey[] }[] = [
    { label: "no permissions", keys: [] },
    { label: "analytics only", keys: ["READ_HACK_DATA"] },
    { label: "reader", keys: ["READ_HACKERS"] },
    { label: "editor", keys: ["EDIT_HACKERS"] },
    { label: "reader and editor", keys: ["READ_HACKERS", "EDIT_HACKERS"] },
    { label: "officer", keys: ["IS_OFFICER"] },
  ];

  describe.each(actors)("$label", ({ keys }) => {
    it.each(PROCEDURES)("%s uses its hacker capability", async (name, call) => {
      // Separate granting roles must union exactly as a single role would.
      mocks.permissionRows = keys.map((key) => ({
        permissions: permissionBitstring(key),
      }));
      const allowed =
        keys.includes("IS_OFFICER") ||
        (name !== "setBlacklist" &&
          (keys.includes("EDIT_HACKERS") ||
            (reads.has(name) && keys.includes("READ_HACKERS"))));
      if (!allowed) {
        await expect(call(createCaller())).rejects.toMatchObject({
          code: "FORBIDDEN",
        });
        expect(mocks.db.select).toHaveBeenCalledTimes(1);
        return;
      }
      // The DB harness deliberately stops authorized calls after the guard.
      let refused = false;
      try {
        await call(createCaller());
      } catch (error) {
        refused =
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "FORBIDDEN";
      }
      expect(refused).toBe(false);
    });
  });

  it.each([true, false])(
    "rejects blacklist=%s before any roster, count, or selection read",
    async (blacklisted) => {
      mocks.permissionRows = [
        { permissions: permissionBitstring("READ_HACKERS", "EDIT_HACKERS") },
      ];
      const caller = createCaller();
      const input = { hackathonId: HACKATHON_ID, filter: { blacklisted } };
      await expect(caller.listForHackathon(input)).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(caller.statusCounts(input)).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(
        caller.selectionSurvival({ ...input, attendeeIds: [ATTENDEE_ID] }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(mocks.db.select).toHaveBeenCalledTimes(3);
    },
  );

  it("reloads permissions when a role grant is revoked", async () => {
    const caller = createCaller();
    mocks.permissionRows = [
      { permissions: permissionBitstring("READ_HACKERS") },
    ];
    // A second select proves the permission guard reached the roster query.
    await caller.listHackathonOptions().catch(() => undefined);
    expect(mocks.db.select).toHaveBeenCalledTimes(2);
    mocks.permissionRows = [];
    await expect(caller.listHackathonOptions()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(mocks.db.select).toHaveBeenCalledTimes(3);
  });
});
