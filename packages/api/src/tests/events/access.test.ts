import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@forge/auth/server";
import { PERMISSIONS } from "@forge/consts";

import {
  createCallerFactory,
  createTRPCRouter,
  permProcedure,
} from "../../trpc";
import {
  assertClubEvent,
  requireEventCheckIn,
  requireEventEdit,
  requireEventRead,
} from "../../utils/events/access";
import { EVENT_IDS, eventRecord } from "../support/events/fixtures";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
  permissionRows: [] as { permissions: string }[],
}));

vi.mock("@forge/db/client", () => ({ db: mocks.db }));

const testRouter = createTRPCRouter({
  archiveTag: permProcedure.mutation(({ ctx }) => {
    requireEventEdit(ctx);
    return "mutated" as const;
  }),
  checkInMember: permProcedure.mutation(({ ctx }) => {
    requireEventCheckIn(ctx);
    return "checked-in" as const;
  }),
  createEvent: permProcedure.mutation(({ ctx }) => {
    requireEventEdit(ctx);
    return "mutated" as const;
  }),
  exportAttendance: permProcedure.query(({ ctx }) => {
    requireEventRead(ctx);
    return "csv" as const;
  }),
  getAdminEvent: permProcedure.query(({ ctx }) => {
    requireEventRead(ctx);
    return "detail" as const;
  }),
  listAdminEvents: permProcedure.query(({ ctx }) => {
    requireEventRead(ctx);
    return "list" as const;
  }),
  listAttendees: permProcedure.query(({ ctx }) => {
    requireEventRead(ctx);
    return "attendees" as const;
  }),
  listCheckInEvents: permProcedure.query(({ ctx }) => {
    requireEventCheckIn(ctx);
    return "choices" as const;
  }),
  listEventTags: permProcedure.query(({ ctx }) => {
    requireEventRead(ctx);
    return "tags" as const;
  }),
  removeAttendance: permProcedure.mutation(({ ctx }) => {
    requireEventEdit(ctx);
    return "mutated" as const;
  }),
  repairIntegration: permProcedure.mutation(({ ctx }) => {
    requireEventEdit(ctx);
    return "mutated" as const;
  }),
  searchCheckInMembers: permProcedure.query(({ ctx }) => {
    requireEventCheckIn(ctx);
    return "members" as const;
  }),
});

const callerFactory = createCallerFactory(testRouter);
const session = {
  user: {
    id: "00000000-0000-4000-8000-000000000801",
    name: "event-access-test",
  },
} as Session;

function permissionBitstring(...keys: PERMISSIONS.PermissionKey[]) {
  const maxIndex = Math.max(
    ...Object.values(PERMISSIONS.PERMISSION_DATA).map(({ idx }) => idx),
  );
  const bits = Array.from({ length: maxIndex + 1 }, () => "0");
  for (const key of keys) {
    const permission = PERMISSIONS.PERMISSION_DATA[key];
    if (!permission) throw new Error(`Unknown permission: ${key}`);
    bits[permission.idx] = "1";
  }
  return bits.join("");
}

function createCaller(currentSession: Session | null = session) {
  return callerFactory({
    headers: new Headers(),
    session: currentSession,
    source: "event-access-test",
  });
}

describe("event API access policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.permissionRows = [];
    mocks.db.select.mockImplementation(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve(mocks.permissionRows)),
        })),
      })),
    }));
  });

  it("[TC-NEG-001] distinguishes unauthenticated and authenticated permission failures", async () => {
    await expect(createCaller(null).listAdminEvents()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(mocks.db.select).not.toHaveBeenCalled();

    mocks.permissionRows = [
      { permissions: permissionBitstring("READ_CLUB_DATA") },
    ];
    await expect(createCaller().listAdminEvents()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("[TC-033] lets readers read and export but not mutate or check in", async () => {
    mocks.permissionRows = [
      { permissions: permissionBitstring("READ_CLUB_EVENT") },
    ];

    await expect(createCaller().listAdminEvents()).resolves.toBe("list");
    await expect(createCaller().getAdminEvent()).resolves.toBe("detail");
    await expect(createCaller().listAttendees()).resolves.toBe("attendees");
    await expect(createCaller().exportAttendance()).resolves.toBe("csv");
    await expect(createCaller().createEvent()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(createCaller().checkInMember()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("[TC-033] makes edit imply read without implying check-in", async () => {
    mocks.permissionRows = [
      { permissions: permissionBitstring("EDIT_CLUB_EVENT") },
    ];

    await expect(createCaller().listAdminEvents()).resolves.toBe("list");
    await expect(createCaller().createEvent()).resolves.toBe("mutated");
    await expect(createCaller().archiveTag()).resolves.toBe("mutated");
    await expect(createCaller().repairIntegration()).resolves.toBe("mutated");
    await expect(createCaller().removeAttendance()).resolves.toBe("mutated");
    await expect(createCaller().checkInMember()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("[TC-033, TC-NEG-013] limits check-in-only callers to the three minimal operations", async () => {
    mocks.permissionRows = [
      { permissions: permissionBitstring("CHECKIN_CLUB_EVENT") },
    ];
    const caller = createCaller();

    await expect(caller.listCheckInEvents()).resolves.toBe("choices");
    await expect(caller.searchCheckInMembers()).resolves.toBe("members");
    await expect(caller.checkInMember()).resolves.toBe("checked-in");

    for (const adjacentCall of [
      () => caller.listAdminEvents(),
      () => caller.getAdminEvent(),
      () => caller.listAttendees(),
      () => caller.exportAttendance(),
      () => caller.listEventTags(),
      () => caller.createEvent(),
      () => caller.archiveTag(),
      () => caller.repairIntegration(),
      () => caller.removeAttendance(),
    ]) {
      await expect(adjacentCall()).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  });

  it("[TC-033] lets officers use every club event capability", async () => {
    mocks.permissionRows = [{ permissions: permissionBitstring("IS_OFFICER") }];
    const caller = createCaller();

    await expect(caller.listAdminEvents()).resolves.toBe("list");
    await expect(caller.createEvent()).resolves.toBe("mutated");
    await expect(caller.checkInMember()).resolves.toBe("checked-in");
  });

  it("[TC-NEG-002] makes a hackathon Event UUID not found to Club helpers", () => {
    const hackathonEvent = eventRecord({
      hackathonId: "00000000-0000-4000-8000-000000000701",
      id: EVENT_IDS.hackathon,
    });

    try {
      assertClubEvent(hackathonEvent);
      throw new Error("Expected the hackathon Event to be rejected.");
    } catch (error) {
      expect(error).toMatchObject({ code: "NOT_FOUND" });
    }
    expect(assertClubEvent(eventRecord())).toMatchObject({
      hackathonId: null,
    });
  });
});
