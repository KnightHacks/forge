import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@forge/auth/server";
import { PERMISSIONS } from "@forge/consts";

import {
  createCallerFactory,
  createTRPCRouter,
  permProcedure,
} from "../../trpc";
import {
  requireEmailPortal,
  requireEmailRecipientHistory,
  requireTeamAudienceConfiguration,
} from "../../utils/email/access";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
  permissionRows: [] as { permissions: string }[],
}));

vi.mock("@forge/db/client", () => ({ db: mocks.db }));

const testRouter = createTRPCRouter({
  archiveTemplate: permProcedure.mutation(({ ctx }) => {
    requireEmailPortal(ctx);
    return "archive" as const;
  }),
  confirmSend: permProcedure.mutation(({ ctx }) => {
    requireEmailPortal(ctx);
    return "confirm" as const;
  }),
  getSend: permProcedure.query(({ ctx }) => {
    requireEmailRecipientHistory(ctx);
    return "send" as const;
  }),
  listTemplates: permProcedure.query(({ ctx }) => {
    requireEmailPortal(ctx);
    return "templates" as const;
  }),
  previewSend: permProcedure.mutation(({ ctx }) => {
    requireEmailPortal(ctx);
    return "preview" as const;
  }),
  publishTemplate: permProcedure.mutation(({ ctx }) => {
    requireEmailPortal(ctx);
    return "publish" as const;
  }),
  updateEmailAudience: permProcedure.mutation(({ ctx }) => {
    requireTeamAudienceConfiguration(ctx);
    return "role" as const;
  }),
});

const callerFactory = createCallerFactory(testRouter);
const session = {
  user: {
    id: "00000000-0000-4000-8000-000000000040",
    name: "email-access-test",
  },
} as Session;

function permissionBitstring(...keys: PERMISSIONS.PermissionKey[]) {
  const maxIndex = Math.max(
    ...Object.values(PERMISSIONS.PERMISSION_DATA).map(({ idx }) => idx),
  );
  const bits = Array.from({ length: maxIndex + 1 }, () => "0");
  for (const key of keys) {
    bits[PERMISSIONS.PERMISSION_DATA[key].idx] = "1";
  }
  return bits.join("");
}

function createCaller(currentSession: Session | null = session) {
  return callerFactory({
    headers: new Headers(),
    session: currentSession,
    source: "email-access-test",
  });
}

describe("Email Portal API access policy", () => {
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

  it("TC-040 distinguishes unauthenticated and forbidden callers", async () => {
    await expect(createCaller(null).listTemplates()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });

    mocks.permissionRows = [
      { permissions: permissionBitstring("READ_MEMBERS") },
    ];
    await expect(createCaller().listTemplates()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("TC-040 gives EMAIL_PORTAL the complete V1 portal surface", async () => {
    mocks.permissionRows = [
      { permissions: permissionBitstring("EMAIL_PORTAL") },
    ];
    const caller = createCaller();

    await expect(caller.listTemplates()).resolves.toBe("templates");
    await expect(caller.publishTemplate()).resolves.toBe("publish");
    await expect(caller.archiveTemplate()).resolves.toBe("archive");
    await expect(caller.previewSend()).resolves.toBe("preview");
    await expect(caller.confirmSend()).resolves.toBe("confirm");
    await expect(caller.getSend()).resolves.toBe("send");
  });

  it("TC-040 gives officers the complete V1 portal surface", async () => {
    mocks.permissionRows = [{ permissions: permissionBitstring("IS_OFFICER") }];
    const caller = createCaller();

    await expect(caller.listTemplates()).resolves.toBe("templates");
    await expect(caller.publishTemplate()).resolves.toBe("publish");
    await expect(caller.confirmSend()).resolves.toBe("confirm");
    await expect(caller.getSend()).resolves.toBe("send");
  });

  it("TC-041 reserves team classification for role administrators", async () => {
    mocks.permissionRows = [
      { permissions: permissionBitstring("EMAIL_PORTAL") },
    ];
    await expect(createCaller().updateEmailAudience()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    mocks.permissionRows = [
      { permissions: permissionBitstring("CONFIGURE_ROLES") },
    ];
    await expect(createCaller().updateEmailAudience()).resolves.toBe("role");

    mocks.permissionRows = [{ permissions: permissionBitstring("IS_OFFICER") }];
    await expect(createCaller().updateEmailAudience()).resolves.toBe("role");
  });

  it("TC-NEG-014 blocks direct recipient-history access", async () => {
    mocks.permissionRows = [
      { permissions: permissionBitstring("READ_MEMBERS") },
    ];
    await expect(createCaller().getSend()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
