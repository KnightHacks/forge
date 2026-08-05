import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@forge/auth/server";

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

  describe("TC-NEG-001: signed in without IS_OFFICER", () => {
    it.each(PROCEDURES)(
      "%s rejects a READ_HACKERS holder",
      async (_name, call) => {
        // Deliberately the permission a reader would assume grants the roster.
        // The SRD says it does not — the roster carries applicant PII and every
        // write here is officer-only — so this pins a decision, not an accident.
        mocks.permissionRows = [
          {
            permissions: permissionBitstring("READ_HACKERS", "READ_HACK_DATA"),
          },
        ];

        await expect(call(createCaller())).rejects.toMatchObject({
          code: "FORBIDDEN",
        });
        // One select: the permission lookup. Nothing read the roster.
        expect(mocks.db.select).toHaveBeenCalledTimes(1);
      },
    );
  });

  describe("positive control", () => {
    it.each(PROCEDURES)(
      "%s admits an officer past the permission guard",
      async (_name, call) => {
        mocks.permissionRows = [
          { permissions: permissionBitstring("IS_OFFICER") },
        ];

        // Admitted means "not refused for permission" — which is either a
        // resolution, or a failure from the throwing mocks further in. Written
        // as an explicit catch rather than `rejects.not.toMatchObject`, because
        // that form fails outright on a procedure whose mocked reads happen to
        // succeed, and it would then be reporting a harness detail as an access
        // failure.
        //
        // Without this control a guard that refused everyone would pass every
        // negative case above.
        let refused = false;
        try {
          await call(createCaller());
        } catch (error) {
          refused =
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            (error as { code?: unknown }).code === "FORBIDDEN";
        }
        expect(refused).toBe(false);
      },
    );
  });
});
