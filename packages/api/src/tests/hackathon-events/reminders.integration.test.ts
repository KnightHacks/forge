import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { db } from "@forge/db/client";
import type * as KnightHacksSchemaModule from "@forge/db/schemas/knight-hacks";
import type { DisposableDatabase } from "@forge/db/testing";
import { eq } from "@forge/db";
import {
  canRunDatabaseTests,
  provisionDisposableDatabase,
} from "@forge/db/testing";

import type { selectClubReminderCandidates } from "../../utils/events/reminders";
import type {
  claimHackathonEventReminderDeliveries,
  completeHackathonEventReminderDelivery,
} from "../../utils/hackathon-events/reminders";

type DatabaseClient = typeof db;
type KnightHacksSchemas = typeof KnightHacksSchemaModule;
type ClaimReminders = typeof claimHackathonEventReminderDeliveries;
type CompleteReminder = typeof completeHackathonEventReminderDelivery;
type SelectClubReminders = typeof selectClubReminderCandidates;

const NOW = new Date("2026-08-05T16:00:00.000Z");
const HACKATHON_ID = "10000000-0000-4000-8000-000000000501";
const ELIGIBLE_ID = "20000000-0000-4000-8000-000000000501";
const PRIMARY_ID = "20000000-0000-4000-8000-000000000502";
const LEGACY_ID = "20000000-0000-4000-8000-000000000503";
const UNHEALTHY_ID = "20000000-0000-4000-8000-000000000504";
const DELETING_ID = "20000000-0000-4000-8000-000000000505";
const OUTSIDE_ID = "20000000-0000-4000-8000-000000000506";
const CLUB_ID = "20000000-0000-4000-8000-000000000507";
const GUILD_ID = "990000000000000001";

describe.skipIf(!canRunDatabaseTests())(
  "hackathon reminder selector and delivery ledger",
  () => {
    let claim: ClaimReminders;
    let client: DatabaseClient;
    let complete: CompleteReminder;
    let disposable: DisposableDatabase | undefined;
    let knightHacks: KnightHacksSchemas;
    let selectClub: SelectClubReminders;

    beforeAll(async () => {
      disposable = await provisionDisposableDatabase("forge_hack_reminders");
      // eslint-disable-next-line no-restricted-properties
      process.env.DATABASE_URL = disposable.url;
      ({ db: client } = await import("@forge/db/client"));
      knightHacks = await import("@forge/db/schemas/knight-hacks");
      ({ selectClubReminderCandidates: selectClub } =
        await import("../../utils/events/reminders"));
      ({
        claimHackathonEventReminderDeliveries: claim,
        completeHackathonEventReminderDelivery: complete,
      } = await import("../../utils/hackathon-events/reminders"));
    });

    afterAll(async () => {
      await client.$client.end().catch(() => undefined);
      await disposable?.drop();
    });

    beforeEach(async () => {
      await client.delete(knightHacks.Event);
      await client.delete(knightHacks.EventTag);
      await client.delete(knightHacks.Hackathon);
      await client.insert(knightHacks.Hackathon).values({
        applicationDeadline: new Date("2026-07-01T00:00:00.000Z"),
        applicationOpen: new Date("2026-06-01T00:00:00.000Z"),
        confirmationDeadline: new Date("2026-07-15T00:00:00.000Z"),
        displayName: "Reminder Hackathon",
        endDate: new Date("2026-08-10T00:00:00.000Z"),
        eventAnnouncementChannelId: "990000000000000002",
        generalHackerDiscordRoleId: "990000000000000003",
        id: HACKATHON_ID,
        name: "reminder-hackathon",
        startDate: new Date("2026-08-05T00:00:00.000Z"),
        theme: "Reminder",
      });
    });

    function event(
      id: string,
      overrides: Partial<typeof knightHacks.Event.$inferInsert> = {},
    ): typeof knightHacks.Event.$inferInsert {
      return {
        creationKey: id,
        creationPayloadHash: id.replaceAll("-", "").padEnd(64, "0"),
        description: "Reminder fixture",
        discordAppliedEntityType: "external",
        discordAppliedRevision: 1,
        discordId: `discord-${id}`,
        discordSyncState: "synced",
        end_datetime: new Date("2026-08-05T17:00:00.000Z"),
        googleAppliedCalendarId: "calendar",
        googleAppliedDestination: "public",
        googleAppliedRevision: 1,
        googleId: `google-${id}`,
        googleSyncState: "synced",
        hackathonId: HACKATHON_ID,
        id,
        legacy: false,
        location: "Venue",
        name: `Event ${id.slice(-3)}`,
        points: 5,
        publishedAt: new Date("2026-08-05T15:00:00.000Z"),
        start_datetime: new Date("2026-08-05T16:15:00.000Z"),
        tag: "Hackathon",
        visibilityDuesPaying: false,
        visibilityInternal: false,
        visibilityRevision: 1,
        visibilityRoles: [],
        ...overrides,
      };
    }

    it("[TC-REM-001] keeps Club and hack selectors disjoint", async () => {
      await client.insert(knightHacks.Event).values([
        event(ELIGIBLE_ID),
        event(PRIMARY_ID, { purpose: "primary_check_in" }),
        event(LEGACY_ID, {
          creationKey: null,
          creationPayloadHash: null,
          legacy: true,
        }),
        event(UNHEALTHY_ID, {
          discordSyncState: "error",
          start_datetime: new Date("2026-08-05T16:17:00.000Z"),
        }),
        event(DELETING_ID, { deletionIntentAt: NOW }),
        event(OUTSIDE_ID, {
          start_datetime: new Date("2026-08-05T16:17:00.000Z"),
        }),
        event(CLUB_ID, { hackathonId: null }),
      ]);

      const [hack, club] = await Promise.all([
        claim({ guildId: GUILD_ID, now: NOW }),
        selectClub({ now: NOW }),
      ]);

      expect(hack.map(({ eventId }) => eventId)).toEqual([ELIGIBLE_ID]);
      expect(club.map(({ id }) => id)).toEqual([CLUB_ID]);
    });

    it("loads Club settings by stable tag identity while retaining event snapshots", async () => {
      const tagId = "30000000-0000-4000-8000-000000000502";
      await client.insert(knightHacks.EventTag).values({
        id: tagId,
        name: "Project Launch",
        normalizedName: "project launch",
        color: "#123456",
        emoji: "🚀",
        announcementChannelId: "990000000000000950",
        skipNextWeek: true,
      });
      await client
        .insert(knightHacks.Event)
        .values([
          event(CLUB_ID, { hackathonId: null, tagId, tag: "Original label" }),
          event(LEGACY_ID, { hackathonId: null, tag: "Project Launch" }),
        ]);
      await client
        .update(knightHacks.EventTag)
        .set({
          name: "Renamed tag",
          normalizedName: "renamed tag",
        })
        .where(eq(knightHacks.EventTag.id, tagId));

      const rows = await selectClub({ now: NOW });
      expect(rows.find(({ id }) => id === CLUB_ID)).toMatchObject({
        tag: "Original label",
        emoji: "🚀",
        announcementChannelId: "990000000000000950",
        skipNextWeek: true,
      });
      expect(rows.find(({ id }) => id === LEGACY_ID)).toMatchObject({
        emoji: null,
        announcementChannelId: null,
        skipNextWeek: false,
      });
    });

    it("routes through the tag channel even without a hackathon default and freezes its emoji", async () => {
      const tagId = "30000000-0000-4000-8000-000000000501";
      await client.insert(knightHacks.EventTag).values({
        id: tagId,
        hackathonId: HACKATHON_ID,
        name: "Food",
        normalizedName: "food",
        color: "#abcdef",
        emoji: "🍕",
        announcementChannelId: "990000000000000950",
      });
      await client
        .update(knightHacks.Hackathon)
        .set({ eventAnnouncementChannelId: null })
        .where(eq(knightHacks.Hackathon.id, HACKATHON_ID));
      await client
        .insert(knightHacks.Event)
        .values(event(ELIGIBLE_ID, { tagId }));
      const [delivery] = await claim({ guildId: GUILD_ID, now: NOW });
      if (!delivery) throw new Error("Expected tag-routed delivery.");
      expect(delivery).toMatchObject({
        eventId: ELIGIBLE_ID,
        channelId: "990000000000000950",
        emoji: "🍕",
      });
      await client
        .update(knightHacks.EventTag)
        .set({
          name: "Meals",
          emoji: "🥗",
          announcementChannelId: "990000000000000951",
        })
        .where(eq(knightHacks.EventTag.id, tagId));
      await client
        .update(knightHacks.HackathonEventReminderDelivery)
        .set({ state: "failed", lockedAt: null, nextAttemptAt: NOW })
        .where(
          eq(
            knightHacks.HackathonEventReminderDelivery.id,
            delivery.deliveryId,
          ),
        );
      expect(await claim({ guildId: GUILD_ID, now: NOW })).toEqual([
        expect.objectContaining({
          deliveryId: delivery.deliveryId,
          channelId: "990000000000000950",
          emoji: "🍕",
        }),
      ]);
    });

    it("[TC-PUB-012] plans reminders without a Discord Scheduled Event", async () => {
      await client.insert(knightHacks.Event).values(
        event(ELIGIBLE_ID, {
          discordAppliedEntityType: null,
          discordAppliedRevision: null,
          discordId: null,
          discordSyncState: "disabled",
          publishedAt: null,
        }),
      );

      const [delivery] = await claim({ guildId: GUILD_ID, now: NOW });

      expect(delivery).toMatchObject({
        discordEventId: null,
        eventId: ELIGIBLE_ID,
        roleId: "990000000000000003",
      });
    });

    it.each([
      { setting: "changed", channelId: "990000000000000951", emoji: "🥗" },
      { setting: "cleared", channelId: null, emoji: null },
    ])(
      "waits for an in-flight tag edit when its destination is $setting",
      async ({ channelId, emoji }) => {
        if (!disposable) throw new Error("Missing disposable database.");
        const tagId = "30000000-0000-4000-8000-000000000503";
        await client
          .update(knightHacks.Hackathon)
          .set({ eventAnnouncementChannelId: null })
          .where(eq(knightHacks.Hackathon.id, HACKATHON_ID));
        await client.insert(knightHacks.EventTag).values({
          id: tagId,
          hackathonId: HACKATHON_ID,
          name: "Food",
          normalizedName: "food",
          color: "#abcdef",
          emoji: "🍕",
          announcementChannelId: "990000000000000950",
        });
        await client
          .insert(knightHacks.Event)
          .values(event(ELIGIBLE_ID, { tagId }));

        const editor = disposable.client;
        await editor.query("BEGIN");
        let deliveries: Awaited<ReturnType<ClaimReminders>> | undefined;
        let planning: Promise<void> | undefined;
        let claimError: unknown;
        try {
          await editor.query(
            "UPDATE knight_hacks_event_tag SET emoji = $1, announcement_channel_id = $2 WHERE id = $3",
            [emoji, channelId, tagId],
          );
          let completed = false;
          planning = claim({ guildId: GUILD_ID, now: NOW }).then(
            (result) => {
              deliveries = result;
              completed = true;
            },
            (error: unknown) => {
              claimError = error;
              completed = true;
            },
          );
          // Wait for an actual lock wait (or the buggy early completion), rather
          // than assuming a scheduler delay puts the claim inside its transaction.
          await expect
            .poll(async () => {
              const result = await editor.query<{ blocked: boolean }>(
                "SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND pg_backend_pid() = ANY(pg_blocking_pids(pid))) AS blocked",
              );
              return completed || result.rows[0]?.blocked;
            })
            .toBe(true);
        } finally {
          await editor.query("COMMIT");
          await planning;
        }
        if (claimError) {
          throw claimError instanceof Error
            ? claimError
            : new Error("Reminder claim failed.", { cause: claimError });
        }
        expect(deliveries).toEqual(
          channelId
            ? [
                expect.objectContaining({
                  eventId: ELIGIBLE_ID,
                  channelId,
                  emoji,
                }),
              ]
            : [],
        );
      },
    );

    it("[TC-REM-003] deduplicates concurrent planning and definite retries", async () => {
      await client.insert(knightHacks.Event).values(event(ELIGIBLE_ID));
      const replicas = await Promise.all([
        claim({ guildId: GUILD_ID, now: NOW }),
        claim({ guildId: GUILD_ID, now: NOW }),
      ]);
      const planned = replicas.flat();
      expect(planned).toHaveLength(1);

      const deliveryId = planned[0]?.deliveryId;
      expect(deliveryId).toBeDefined();
      if (!deliveryId) throw new Error("Expected one claimed delivery.");
      await client
        .update(knightHacks.HackathonEventReminderDelivery)
        .set({ lockedAt: null, nextAttemptAt: NOW, state: "failed" })
        .where(eq(knightHacks.HackathonEventReminderDelivery.id, deliveryId));
      const retry = await claim({ guildId: GUILD_ID, now: NOW });
      expect(retry.map(({ deliveryId: id }) => id)).toEqual([deliveryId]);
      await complete(deliveryId);

      await client
        .update(knightHacks.Event)
        .set({ name: "Edited after delivery" })
        .where(eq(knightHacks.Event.id, ELIGIBLE_ID));
      expect(await claim({ guildId: GUILD_ID, now: NOW })).toEqual([]);
      const ledger = await client
        .select()
        .from(knightHacks.HackathonEventReminderDelivery);
      expect(ledger).toHaveLength(1);
      expect(ledger[0]?.state).toBe("delivered");
    });

    it("[TC-REM-004] freezes delivery snapshots before the first provider attempt", async () => {
      await client.insert(knightHacks.Event).values(event(ELIGIBLE_ID));
      const [initial] = await claim({ guildId: GUILD_ID, now: NOW });
      expect(initial).toBeDefined();
      if (!initial) throw new Error("Expected one claimed delivery.");

      await client
        .update(knightHacks.HackathonEventReminderDelivery)
        .set({
          lastError: "discord_temporarily_unavailable",
          lockedAt: null,
          nextAttemptAt: NOW,
          state: "failed",
        })
        .where(
          eq(knightHacks.HackathonEventReminderDelivery.id, initial.deliveryId),
        );

      const editedStart = new Date("2026-08-05T16:10:00.000Z");
      const editedEnd = new Date("2026-08-05T18:30:00.000Z");
      const editedChannelId = "990000000000000012";
      const editedRoleId = "990000000000000013";
      await Promise.all([
        client
          .update(knightHacks.Event)
          .set({
            description: "Updated reminder fixture",
            discordId: "discord-edited",
            end_datetime: editedEnd,
            location: "Updated Venue",
            name: "Updated Event",
            start_datetime: editedStart,
            tag: "Updated Hackathon",
          })
          .where(eq(knightHacks.Event.id, ELIGIBLE_ID)),
        client
          .update(knightHacks.Hackathon)
          .set({
            eventAnnouncementChannelId: editedChannelId,
            generalHackerDiscordRoleId: editedRoleId,
          })
          .where(eq(knightHacks.Hackathon.id, HACKATHON_ID)),
      ]);

      const refreshed = await claim({ guildId: GUILD_ID, now: NOW });
      expect(refreshed).toEqual([
        expect.objectContaining({
          channelId: "990000000000000002",
          deliveryId: initial.deliveryId,
          description: "Reminder fixture",
          discordEventId: `discord-${ELIGIBLE_ID}`,
          endDateTime: "2026-08-05T17:00:00.000Z",
          eventId: ELIGIBLE_ID,
          location: "Venue",
          name: "Event 501",
          roleId: "990000000000000003",
          startDateTime: "2026-08-05T16:15:00.000Z",
          tag: "Hackathon",
        }),
      ]);

      const ledger = await client
        .select()
        .from(knightHacks.HackathonEventReminderDelivery);
      expect(ledger).toHaveLength(1);
      expect(ledger[0]).toMatchObject({
        attemptCount: 2,
        destinationChannelIdSnapshot: "990000000000000002",
        discordEventIdSnapshot: `discord-${ELIGIBLE_ID}`,
        eventStartAt: new Date("2026-08-05T16:15:00.000Z"),
        id: initial.deliveryId,
        lastError: null,
        nextAttemptAt: null,
        roleIdSnapshot: "990000000000000003",
        state: "delivering",
      });
      expect(JSON.parse(ledger[0]?.contentSnapshot ?? "{}")).toEqual({
        emoji: null,
        description: "Reminder fixture",
        endDateTime: "2026-08-05T17:00:00.000Z",
        location: "Venue",
        name: "Event 501",
        startDateTime: "2026-08-05T16:15:00.000Z",
        tag: "Hackathon",
      });
    });

    it("[TC-REM-004B] preserves retry backoff and snapshots after live edits", async () => {
      await client.insert(knightHacks.Event).values(event(ELIGIBLE_ID));
      const [delivery] = await claim({ guildId: GUILD_ID, now: NOW });
      if (!delivery) throw new Error("Expected one claimed delivery.");
      const nextAttemptAt = new Date(NOW.getTime() + 5 * 60_000);
      await client
        .update(knightHacks.HackathonEventReminderDelivery)
        .set({
          lastError: "discord_temporarily_unavailable",
          lockedAt: null,
          nextAttemptAt,
          state: "failed",
        })
        .where(
          eq(
            knightHacks.HackathonEventReminderDelivery.id,
            delivery.deliveryId,
          ),
        );
      await Promise.all([
        client
          .update(knightHacks.Event)
          .set({
            description: "Edited during backoff",
            discordId: "discord-edited-during-backoff",
            name: "Edited during backoff",
          })
          .where(eq(knightHacks.Event.id, ELIGIBLE_ID)),
        client
          .update(knightHacks.Hackathon)
          .set({
            eventAnnouncementChannelId: "990000000000000022",
            generalHackerDiscordRoleId: "990000000000000023",
          })
          .where(eq(knightHacks.Hackathon.id, HACKATHON_ID)),
      ]);

      expect(await claim({ guildId: GUILD_ID, now: NOW })).toEqual([]);
      const row = await client.query.HackathonEventReminderDelivery.findFirst();
      expect(row).toMatchObject({
        attemptCount: 1,
        destinationChannelIdSnapshot: "990000000000000002",
        discordEventIdSnapshot: `discord-${ELIGIBLE_ID}`,
        lastError: "discord_temporarily_unavailable",
        nextAttemptAt,
        roleIdSnapshot: "990000000000000003",
        state: "failed",
      });
      expect(JSON.parse(row?.contentSnapshot ?? "{}")).toMatchObject({
        description: "Reminder fixture",
        name: "Event 501",
      });
    });

    it("[TC-REM-005] quarantines stale delivering claims as unknown", async () => {
      await client.insert(knightHacks.Event).values(event(ELIGIBLE_ID));
      const [delivery] = await claim({ guildId: GUILD_ID, now: NOW });
      expect(delivery).toBeDefined();
      if (!delivery) throw new Error("Expected one claimed delivery.");
      await client
        .update(knightHacks.HackathonEventReminderDelivery)
        .set({
          lockedAt: new Date(NOW.getTime() - 31_000),
          state: "delivering",
        })
        .where(
          eq(
            knightHacks.HackathonEventReminderDelivery.id,
            delivery.deliveryId,
          ),
        );

      expect(await claim({ guildId: GUILD_ID, now: NOW })).toEqual([]);
      const row = await client.query.HackathonEventReminderDelivery.findFirst();
      expect(row).toMatchObject({
        lastError: "delivery_outcome_ambiguous",
        lockedAt: null,
        state: "unknown",
      });
    });

    it("[TC-REM-006] revalidates event eligibility before leasing a retry", async () => {
      await client.insert(knightHacks.Event).values(event(ELIGIBLE_ID));
      const [delivery] = await claim({ guildId: GUILD_ID, now: NOW });
      if (!delivery) throw new Error("Expected one claimed delivery.");
      await client
        .update(knightHacks.HackathonEventReminderDelivery)
        .set({ lockedAt: null, nextAttemptAt: NOW, state: "failed" })
        .where(
          eq(
            knightHacks.HackathonEventReminderDelivery.id,
            delivery.deliveryId,
          ),
        );
      await client
        .update(knightHacks.Event)
        .set({ deletionIntentAt: NOW })
        .where(eq(knightHacks.Event.id, ELIGIBLE_ID));

      expect(await claim({ guildId: GUILD_ID, now: NOW })).toEqual([]);
      const row = await client.query.HackathonEventReminderDelivery.findFirst();
      expect(row).toMatchObject({ state: "failed" });
      expect(row?.lockedAt).toBeNull();
    });
  },
);
