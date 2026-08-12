import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@forge/auth/server";

import { memberAdminRouter } from "../../routers/member-admin";
import { createCallerFactory, createTRPCRouter } from "../../trpc";

const mocks = vi.hoisted(() => {
  const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
  const values = vi.fn(() => ({ onConflictDoUpdate }));
  const insert = vi.fn(() => ({ values }));
  const configurationFindFirst = vi.fn();
  const tx = {
    insert,
    query: {
      DuesConfiguration: {
        findFirst: configurationFindFirst,
      },
    },
  };

  return {
    appendAdminAuditResults: vi.fn(),
    configurationFindFirst,
    createAdminAuditEvent: vi.fn().mockResolvedValue({ id: "audit-event" }),
    discordLog: vi.fn().mockResolvedValue(undefined),
    insert,
    onConflictDoUpdate,
    permissions: {
      EDIT_MEMBERS: true,
      IS_OFFICER: false,
      READ_MEMBERS: true,
    },
    transaction: vi.fn((callback: (database: typeof tx) => unknown) =>
      Promise.resolve(callback(tx)),
    ),
    values,
  };
});

vi.mock("@forge/db/client", () => ({
  db: {
    query: {
      DuesConfiguration: {
        findFirst: mocks.configurationFindFirst,
      },
    },
    transaction: mocks.transaction,
  },
}));

vi.mock("../../utils/permissions-db", () => ({
  loadPermissionsForUser: vi.fn(() => Promise.resolve(mocks.permissions)),
}));

vi.mock("../../utils/audit/service", () => ({
  appendAdminAuditResults: mocks.appendAdminAuditResults,
  createAdminAuditEvent: mocks.createAdminAuditEvent,
}));

vi.mock("@forge/utils/discord", () => ({ log: mocks.discordLog }));

vi.mock("../../utils/profile-picture/storage", () => ({
  getProfilePictureDownloadUrlForUser: vi.fn(),
  removeProfilePictureObjectsForUser: vi.fn(),
  saveMemberProfilePictureForUser: vi.fn(),
  uploadProfilePictureForUser: vi.fn(),
}));

vi.mock("../../utils/resume/storage", () => ({
  getMemberResumeDownloadUrlForUser: vi.fn(),
  removeUnreferencedResumeObjectsForUser: vi.fn(),
  saveMemberResumeForUser: vi.fn(),
  uploadResumeForUser: vi.fn(),
}));

const callerFactory = createCallerFactory(
  createTRPCRouter({ memberAdmin: memberAdminRouter }),
);
const session = {
  user: {
    discordUserId: "admin-discord-id",
    id: "00000000-0000-4000-8000-000000000601",
    name: "dues-admin",
  },
} as Session;

function createCaller() {
  return callerFactory({
    headers: new Headers(),
    session,
    source: "dues-configuration-test",
  });
}

describe("admin dues payment configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.permissions.EDIT_MEMBERS = true;
    mocks.permissions.READ_MEMBERS = true;
    mocks.configurationFindFirst.mockResolvedValue({ paymentsEnabled: false });
  });

  it("lets member readers inspect the persisted availability", async () => {
    mocks.permissions.EDIT_MEMBERS = false;

    await expect(
      createCaller().memberAdmin.getDuesPaymentConfiguration(),
    ).resolves.toEqual({ paymentsEnabled: false });
  });

  it("lets member editors enable payments and audits the change", async () => {
    await expect(
      createCaller().memberAdmin.setDuesPaymentsEnabled({
        paymentsEnabled: true,
      }),
    ).resolves.toEqual({ changed: true, paymentsEnabled: true });

    expect(mocks.values).toHaveBeenCalledWith(
      expect.objectContaining({ id: "global", paymentsEnabled: true }),
    );
    expect(mocks.onConflictDoUpdate).toHaveBeenCalledOnce();
    expect(mocks.createAdminAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actionKey: "member.dues.payment_availability_updated",
        changes: [
          {
            after: true,
            before: false,
            field: "paymentsEnabled",
          },
        ],
      }),
      expect.anything(),
    );
  });

  it("rejects payment availability changes from read-only admins", async () => {
    mocks.permissions.EDIT_MEMBERS = false;
    const caller = createCaller();

    await expect(
      caller.memberAdmin.setDuesPaymentsEnabled({
        paymentsEnabled: true,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.transaction).not.toHaveBeenCalled();

    await expect(
      caller.memberAdmin.getDuesPaymentConfiguration(),
    ).resolves.toEqual({ paymentsEnabled: false });
  });
});
