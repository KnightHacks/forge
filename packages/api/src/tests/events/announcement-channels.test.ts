import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@forge/auth/server";
import type { PERMISSIONS } from "@forge/consts";

import { eventRouter } from "../../routers/event";
import { hackathonEventRouter } from "../../routers/hackathon-event";
import { createCallerFactory, createTRPCRouter } from "../../trpc";
import { validateEventAnnouncementChannel } from "../../utils/events/announcement-channel";
import { mergePermissionBitstrings } from "../../utils/permissions";
import { permissionBitstring } from "../support/permissions";

const mocks = vi.hoisted(() => ({
  db: {
    insert: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
    query: { EventTag: { findFirst: vi.fn(), findMany: vi.fn() } },
  },
  loadPermissions: vi.fn(),
  resolveRoleGateway: vi.fn(),
  resolveEventGateways: vi.fn(),
  channels: vi.fn(),
  validateChannel: vi.fn(),
  captureActor: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("@forge/db/client", () => ({ db: mocks.db }));
vi.mock("../../utils/permissions-db", () => ({
  loadPermissionsForUser: mocks.loadPermissions,
}));
vi.mock("../../utils/roles/discord-gateway", () => ({
  resolveRoleDiscordGateway: mocks.resolveRoleGateway,
}));
vi.mock("../../utils/events/gateway-resolver", () => ({
  resolveEventGateways: mocks.resolveEventGateways,
}));
vi.mock("../../utils/audit/service", () => ({
  captureAdminAuditActor: mocks.captureActor,
  createAdminAuditEvent: mocks.audit,
}));

const CHANNEL_ID = "1284582557689843785";
const TAG_ID = "00000000-0000-4000-8000-000000000501";
const HACKATHON_ID = "00000000-0000-4000-8000-000000000502";
const USER_ID = "00000000-0000-4000-8000-000000000503";
const now = new Date("2026-09-06T20:00:00Z");
const session: Session = {
  session: {
    id: "tag-announcement-test",
    userId: USER_ID,
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date("2026-09-07T20:00:00Z"),
    token: "test-token",
  },
  user: {
    id: USER_ID,
    name: "Tag editor",
    discordUserId: "990000000000000503",
    email: "tag-editor@example.test",
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  },
};
const callerFactory = createCallerFactory(
  createTRPCRouter({
    club: eventRouter,
    hackathon: hackathonEventRouter,
  }),
);
function caller(currentSession: Session | null = session) {
  return callerFactory({
    headers: new Headers(),
    session: currentSession,
    source: "tag-announcement-test",
  });
}
function grant(...keys: PERMISSIONS.PermissionKey[]) {
  mocks.loadPermissions.mockResolvedValue(
    mergePermissionBitstrings([permissionBitstring(...keys)]),
  );
}
function expectNoTagMutation() {
  expect(mocks.db.insert).not.toHaveBeenCalled();
  expect(mocks.db.update).not.toHaveBeenCalled();
  expect(mocks.db.transaction).not.toHaveBeenCalled();
  expect(mocks.db.query.EventTag.findFirst).not.toHaveBeenCalled();
  expect(mocks.resolveEventGateways).not.toHaveBeenCalled();
  expect(mocks.captureActor).not.toHaveBeenCalled();
  expect(mocks.audit).not.toHaveBeenCalled();
}
const input = {
  name: "Workshop",
  color: "#123456",
  defaultPoints: 25,
  announcementChannelId: CHANNEL_ID,
};
const catalogs = [
  {
    name: "Club",
    edit: "EDIT_CLUB_EVENT",
    read: "READ_CLUB_EVENT",
    otherEdit: "EDIT_HACK_EVENT",
    list: (client: ReturnType<typeof caller>) =>
      client.club.listAnnouncementChannels(),
    create: () => caller().club.createTag(input),
    update: () =>
      caller().club.updateTag({
        tagId: TAG_ID,
        announcementChannelId: CHANNEL_ID,
      }),
  },
  {
    name: "hackathon",
    edit: "EDIT_HACK_EVENT",
    read: "READ_HACK_EVENT",
    otherEdit: "EDIT_CLUB_EVENT",
    list: (client: ReturnType<typeof caller>) =>
      client.hackathon.listAnnouncementChannels(),
    create: () =>
      caller().hackathon.createTag({ ...input, hackathonId: HACKATHON_ID }),
    update: () =>
      caller().hackathon.updateTag({
        tagId: TAG_ID,
        hackathonId: HACKATHON_ID,
        announcementChannelId: CHANNEL_ID,
      }),
  },
] as const;

beforeEach(() => {
  vi.clearAllMocks();
  grant();
  mocks.validateChannel.mockResolvedValue(true);
  mocks.channels.mockResolvedValue([{ id: CHANNEL_ID, name: "announcements" }]);
  mocks.resolveRoleGateway.mockResolvedValue({
    getGuildTextChannels: mocks.channels,
    validateTextChannel: mocks.validateChannel,
  });
});

describe.each(catalogs)(
  "$name tag announcement endpoint authorization",
  (catalog) => {
    it("requires authentication before channel discovery", async () => {
      await expect(catalog.list(caller(null))).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
      expect(mocks.resolveRoleGateway).not.toHaveBeenCalled();
      expectNoTagMutation();
    });

    it.each(["read", "otherEdit"] as const)(
      "rejects %s permissions before discovery or writes",
      async (permission) => {
        grant(catalog[permission]);
        await expect(catalog.list(caller())).rejects.toMatchObject({
          code: "FORBIDDEN",
        });
        await expect(catalog.create()).rejects.toMatchObject({
          code: "FORBIDDEN",
        });
        await expect(catalog.update()).rejects.toMatchObject({
          code: "FORBIDDEN",
        });
        expect(mocks.resolveRoleGateway).not.toHaveBeenCalled();
        expectNoTagMutation();
      },
    );

    it("lists announcement destinations for its own editors", async () => {
      grant(catalog.edit);
      await expect(catalog.list(caller())).resolves.toEqual([
        { id: CHANNEL_ID, name: "announcements" },
      ]);
      expect(mocks.channels).toHaveBeenCalledOnce();
      expect(mocks.channels).toHaveBeenCalledWith({
        requireSendPermission: true,
      });
      expectNoTagMutation();
    });

    it.each(["create", "update"] as const)(
      "rejects an invalid destination before %s writes or audit capture",
      async (operation) => {
        grant(catalog.edit);
        mocks.validateChannel.mockResolvedValue(false);
        await expect(catalog[operation]()).rejects.toMatchObject({
          code: "BAD_REQUEST",
          message:
            "Choose a text or announcement channel in this Discord server where the bot has View Channel, Send Messages, and Embed Links permissions.",
        });
        expect(mocks.validateChannel).toHaveBeenCalledWith(CHANNEL_ID, {
          requireSendPermission: true,
        });
        expectNoTagMutation();
      },
    );
  },
);

describe("optional announcement destination validation", () => {
  it.each([undefined, null])(
    "clears or omits %s without consulting Discord",
    async (channel) => {
      await expect(
        validateEventAnnouncementChannel(channel, session),
      ).resolves.toBeUndefined();
      expect(mocks.resolveRoleGateway).not.toHaveBeenCalled();
    },
  );

  it("accepts a channel validated by the guild gateway", async () => {
    await expect(
      validateEventAnnouncementChannel(CHANNEL_ID, session),
    ).resolves.toBeUndefined();
    expect(mocks.resolveRoleGateway).toHaveBeenCalledWith(session);
    expect(mocks.validateChannel).toHaveBeenCalledWith(CHANNEL_ID, {
      requireSendPermission: true,
    });
  });

  it("rejects a destination when channel validation is unavailable", async () => {
    mocks.resolveRoleGateway.mockResolvedValue({});
    await expect(
      validateEventAnnouncementChannel(CHANNEL_ID, session),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
