import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@forge/auth/server";

import { permissionBitstring } from "../support/permissions";

/**
 * `select` serves only the permission lookup; every other database entry point
 * throws.
 *
 * A guard that runs *after* a read has already fetched the row it was meant to
 * protect, so a procedure reaching `db.query`, `db.insert`, `db.delete`,
 * `db.update` or `db.transaction` before asserting `IS_OFFICER` fails loudly
 * here rather than passing quietly.
 *
 * `select` cannot throw — the permission lookup itself needs it — so a throwing
 * mock proves nothing for `list` and `get`, which read *exclusively* through
 * `db.select`. Those are covered instead by asserting the call count: exactly
 * one `select`, the permission lookup, and no data read.
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

const { hackathonRouter } = await import("../../routers/hackathon");
const { createCallerFactory } = await import("../../trpc");

const callerFactory = createCallerFactory(hackathonRouter);

const SESSION = {
  user: { id: "00000000-0000-4000-8000-000000000001", name: "hackathon-test" },
} as Session;

function createCaller(session: Session | null = SESSION) {
  return callerFactory({
    headers: new Headers(),
    session,
    source: "hackathon-access-test",
  });
}

type Caller = ReturnType<typeof createCaller>;

const HACKATHON_ID = "00000000-0000-4000-8000-0000000000aa";
const CLASS_ID = "00000000-0000-4000-8000-0000000000bb";
const TEMPLATE_ID = "00000000-0000-4000-8000-0000000000cc";

const WINDOW = {
  applicationDeadline: new Date("2026-09-01T00:00:00Z"),
  applicationOpen: new Date("2026-08-01T00:00:00Z"),
  applicationUrl: null,
  confirmationDeadline: new Date("2026-09-15T00:00:00Z"),
  displayName: "Knight Hacks X",
  endDate: new Date("2026-10-03T00:00:00Z"),
  startDate: new Date("2026-10-01T00:00:00Z"),
  theme: "Neon",
};

/** Every procedure the router exposes, with input its schema accepts. */
const PROCEDURES: [string, (caller: Caller) => Promise<unknown>][] = [
  ["list", (caller) => caller.list()],
  ["get", (caller) => caller.get({ id: HACKATHON_ID })],
  ["create", (caller) => caller.create(WINDOW)],
  ["update", (caller) => caller.update({ ...WINDOW, id: HACKATHON_ID })],
  ["remove", (caller) => caller.remove({ id: HACKATHON_ID })],
  [
    "setStatusEmail",
    (caller) =>
      caller.setStatusEmail({
        hackathonId: HACKATHON_ID,
        status: "accepted",
        subject: "You're in",
        templateId: TEMPLATE_ID,
      }),
  ],
  [
    "clearStatusEmail",
    (caller) =>
      caller.clearStatusEmail({
        hackathonId: HACKATHON_ID,
        status: "accepted",
      }),
  ],
  [
    "createClass",
    (caller) =>
      caller.createClass({
        color: "#4F46E5",
        discordRoleId: "990000000000000201",
        hackathonId: HACKATHON_ID,
        kind: "class",
        name: "Operators",
      }),
  ],
  [
    "updateClass",
    (caller) =>
      caller.updateClass({
        color: "#4F46E5",
        discordRoleId: "990000000000000201",
        id: CLASS_ID,
        name: "Operators",
      }),
  ],
  ["removeClass", (caller) => caller.removeClass({ id: CLASS_ID })],
];

describe("hackathon configuration access policy", () => {
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

  it("exposes exactly the ten documented procedures", () => {
    // A procedure added without an access decision fails here before review.
    expect(Object.keys(hackathonRouter._def.procedures).sort()).toEqual(
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

  describe("TC-NEG-002: signed in without IS_OFFICER", () => {
    it.each(PROCEDURES)(
      "%s rejects a READ_HACK_DATA and READ_HACKERS holder",
      async (_name, call) => {
        // Deliberately insufficient. These are the two permissions a reader
        // would assume grant hackathon config, and the SRD says they do not —
        // so this pins a decision rather than an accident.
        mocks.permissionRows = [
          {
            permissions: permissionBitstring("READ_HACK_DATA", "READ_HACKERS"),
          },
        ];
        await expect(call(createCaller())).rejects.toMatchObject({
          code: "FORBIDDEN",
        });
        // The permission lookup and nothing else. Without this, a data read
        // moved above the guard in `list` or `get` passes silently, because
        // `select` is the one entry point this mock has to leave open.
        expect(mocks.db.select).toHaveBeenCalledTimes(1);
      },
    );
  });

  describe("an officer is admitted", () => {
    // The positive control. Every other case here is a denial, so without this
    // one, pointing the guard at a permission nobody holds — or shifting the
    // IS_OFFICER bit index — keeps all of them green while locking every
    // officer in the org out of the screen.
    it.each(PROCEDURES)(
      "%s admits an IS_OFFICER holder",
      async (_name, call) => {
        mocks.permissionRows = [
          { permissions: permissionBitstring("IS_OFFICER") },
        ];
        // Rejects for a database reason, never FORBIDDEN: the throwing mock is
        // what stops the procedure once the guard has let it through.
        await expect(call(createCaller())).rejects.not.toMatchObject({
          code: "FORBIDDEN",
        });
      },
    );
  });
});
