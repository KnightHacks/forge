import { and, eq, gt, isNull, lt, lte, ne, or, sql } from "@forge/db";
import { db } from "@forge/db/client";
import {
  Event,
  EventTag,
  Hackathon,
  HackathonEventReminderDelivery,
} from "@forge/db/schemas/knight-hacks";
import { getKnightHacksGuildId } from "@forge/utils/discord-config";

const REMINDER_KEY = "starts_15_minutes";
const CLAIM_LEASE_MS = 30_000;
const RETRY_DELAY_MS = 5 * 60_000;

/**
 * Materialize and lease reminder deliveries for hackathon events. The unique
 * event/reminder key is the durable at-most-once boundary; ambiguous Discord
 * outcomes are never retried automatically.
 */
export async function claimHackathonEventReminderDeliveries({
  guildId: suppliedGuildId,
  now,
}: {
  guildId?: string;
  now: Date;
}) {
  const horizon = new Date(now.getTime() + 16 * 60_000);
  const staleLease = new Date(now.getTime() - CLAIM_LEASE_MS);
  // A worker may have crashed after Discord accepted the POST. Retrying such
  // a lease would violate at-most-once delivery, so quarantine it for repair.
  await db
    .update(HackathonEventReminderDelivery)
    .set({
      lastError: "delivery_outcome_ambiguous",
      lockedAt: null,
      nextAttemptAt: null,
      state: "unknown",
    })
    .where(
      and(
        eq(HackathonEventReminderDelivery.state, "delivering"),
        lt(HackathonEventReminderDelivery.lockedAt, staleLease),
      ),
    );
  const candidates = await db
    .select({
      channelId: sql<
        string | null
      >`coalesce(${EventTag.announcementChannelId}, ${Hackathon.eventAnnouncementChannelId})`,
      description: Event.description,
      discordEventId: Event.discordId,
      endDateTime: Event.end_datetime,
      eventId: Event.id,
      eventStartAt: Event.start_datetime,
      hackathonId: Hackathon.id,
      location: Event.location,
      name: Event.name,
      roleId: Hackathon.generalHackerDiscordRoleId,
      tag: Event.tag,
      emoji: EventTag.emoji,
    })
    .from(Event)
    .innerJoin(Hackathon, eq(Hackathon.id, Event.hackathonId))
    .leftJoin(
      EventTag,
      and(eq(Event.tagId, EventTag.id), eq(EventTag.hackathonId, Hackathon.id)),
    )
    .where(
      and(
        eq(Event.purpose, "event"),
        eq(Event.legacy, false),
        isNull(Event.deletionIntentAt),
        sql`coalesce(${EventTag.announcementChannelId}, ${Hackathon.eventAnnouncementChannelId}) is not null`,
        sql`${Hackathon.generalHackerDiscordRoleId} is not null`,
        gt(Event.start_datetime, now),
        lte(Event.start_datetime, horizon),
      ),
    );

  for (const event of candidates) {
    if (!event.channelId || !event.roleId) continue;
    const contentSnapshot = JSON.stringify({
      description: event.description,
      emoji: event.emoji,
      endDateTime: event.endDateTime.toISOString(),
      location: event.location,
      name: event.name,
      startDateTime: event.eventStartAt.toISOString(),
      tag: event.tag,
    });
    await db
      .insert(HackathonEventReminderDelivery)
      .values({
        contentSnapshot,
        destinationChannelIdSnapshot: event.channelId,
        discordEventIdSnapshot: event.discordEventId,
        eventId: event.eventId,
        eventStartAt: event.eventStartAt,
        hackathonId: event.hackathonId,
        reminderKey: REMINDER_KEY,
        roleIdSnapshot: event.roleId,
      })
      .onConflictDoNothing();
    // A safely unsent identity follows edits and configuration changes. Rows
    // that may already have reached Discord (delivering/unknown/delivered) are
    // immutable so an edit can never create a duplicate ping.
    await db
      .update(HackathonEventReminderDelivery)
      .set({
        contentSnapshot,
        destinationChannelIdSnapshot: event.channelId,
        discordEventIdSnapshot: event.discordEventId,
        eventStartAt: event.eventStartAt,
        lastError: null,
        lockedAt: null,
        nextAttemptAt: null,
        roleIdSnapshot: event.roleId,
        state: "pending",
      })
      .where(
        and(
          eq(HackathonEventReminderDelivery.eventId, event.eventId),
          eq(HackathonEventReminderDelivery.reminderKey, REMINDER_KEY),
          or(
            eq(HackathonEventReminderDelivery.state, "pending"),
            eq(HackathonEventReminderDelivery.state, "failed"),
          ),
          eq(HackathonEventReminderDelivery.attemptCount, 0),
          or(
            ne(HackathonEventReminderDelivery.contentSnapshot, contentSnapshot),
            ne(
              HackathonEventReminderDelivery.destinationChannelIdSnapshot,
              event.channelId,
            ),
            sql`${HackathonEventReminderDelivery.discordEventIdSnapshot} IS DISTINCT FROM ${event.discordEventId}`,
            ne(HackathonEventReminderDelivery.eventStartAt, event.eventStartAt),
            ne(HackathonEventReminderDelivery.roleIdSnapshot, event.roleId),
          ),
        ),
      );
  }

  const claimable = await db
    .select({ id: HackathonEventReminderDelivery.id })
    .from(HackathonEventReminderDelivery)
    .where(
      and(
        gt(HackathonEventReminderDelivery.eventStartAt, now),
        lte(HackathonEventReminderDelivery.eventStartAt, horizon),
        or(
          eq(HackathonEventReminderDelivery.state, "pending"),
          and(
            eq(HackathonEventReminderDelivery.state, "failed"),
            lte(HackathonEventReminderDelivery.nextAttemptAt, now),
          ),
        ),
      ),
    )
    // Lease one immediately actionable delivery at a time. The executor
    // claims again after recording its outcome, so a large batch never sits
    // behind serial Discord requests while its lease expires.
    .limit(1);
  const guildId = suppliedGuildId ?? (await getKnightHacksGuildId());
  const deliveries = [];
  for (const candidate of claimable) {
    const claimed = await db.transaction(async (tx) => {
      const [current] = await tx
        .select({
          channelId: Hackathon.eventAnnouncementChannelId,
          description: Event.description,
          discordEventId: Event.discordId,
          endDateTime: Event.end_datetime,
          eventId: Event.id,
          eventStartAt: Event.start_datetime,
          hackathonId: Hackathon.id,
          attemptCount: HackathonEventReminderDelivery.attemptCount,
          ledgerId: HackathonEventReminderDelivery.id,
          location: Event.location,
          name: Event.name,
          roleId: Hackathon.generalHackerDiscordRoleId,
          tag: Event.tag,
          tagId: Event.tagId,
        })
        .from(HackathonEventReminderDelivery)
        .innerJoin(Event, eq(Event.id, HackathonEventReminderDelivery.eventId))
        .innerJoin(Hackathon, eq(Hackathon.id, Event.hackathonId))
        .where(
          and(
            eq(HackathonEventReminderDelivery.id, candidate.id),
            or(
              eq(HackathonEventReminderDelivery.state, "pending"),
              and(
                eq(HackathonEventReminderDelivery.state, "failed"),
                lte(HackathonEventReminderDelivery.nextAttemptAt, now),
              ),
            ),
            eq(Event.purpose, "event"),
            eq(Event.legacy, false),
            isNull(Event.deletionIntentAt),
            sql`${Hackathon.generalHackerDiscordRoleId} is not null`,
            gt(Event.start_datetime, now),
            lte(Event.start_datetime, horizon),
          ),
        )
        .for("update", {
          of: [HackathonEventReminderDelivery, Event, Hackathon],
        })
        .limit(1);
      if (!current?.roleId) {
        return null;
      }
      // Lock the event before its tag, matching event edits. A separate tag
      // read can lock the optional row and see edits committed while we waited.
      const [tag] = current.tagId
        ? await tx
            .select({
              channelId: EventTag.announcementChannelId,
              emoji: EventTag.emoji,
            })
            .from(EventTag)
            .where(
              and(
                eq(EventTag.id, current.tagId),
                eq(EventTag.hackathonId, current.hackathonId),
              ),
            )
            .for("share")
            .limit(1)
        : [];
      const channelId = tag?.channelId ?? current.channelId;
      if (!channelId) return null;
      const contentSnapshot = JSON.stringify({
        description: current.description,
        emoji: tag?.emoji ?? null,
        endDateTime: current.endDateTime.toISOString(),
        location: current.location,
        name: current.name,
        startDateTime: current.eventStartAt.toISOString(),
        tag: current.tag,
      });
      const [leased] = await tx
        .update(HackathonEventReminderDelivery)
        .set({
          attemptCount: sql`${HackathonEventReminderDelivery.attemptCount} + 1`,
          ...(current.attemptCount === 0
            ? {
                contentSnapshot,
                destinationChannelIdSnapshot: channelId,
                discordEventIdSnapshot: current.discordEventId,
                eventStartAt: current.eventStartAt,
                roleIdSnapshot: current.roleId,
              }
            : {}),
          lastError: null,
          lockedAt: now,
          nextAttemptAt: null,
          state: "delivering",
        })
        .where(eq(HackathonEventReminderDelivery.id, current.ledgerId))
        .returning();
      return leased ?? null;
    });
    if (!claimed) continue;
    const snapshot = JSON.parse(claimed.contentSnapshot) as {
      description: string;
      emoji?: string | null;
      endDateTime: string;
      location: string;
      name: string;
      startDateTime: string;
      tag: string;
    };
    deliveries.push({
      channelId: claimed.destinationChannelIdSnapshot,
      deliveryId: claimed.id,
      discordEventId: claimed.discordEventIdSnapshot,
      eventId: claimed.eventId,
      guildId,
      roleId: claimed.roleIdSnapshot,
      ...snapshot,
    });
  }
  return deliveries;
}

export async function completeHackathonEventReminderDelivery(
  deliveryId: string,
  _messageId?: string,
) {
  await db
    .update(HackathonEventReminderDelivery)
    .set({
      deliveredAt: new Date(),
      lastError: null,
      lockedAt: null,
      nextAttemptAt: null,
      state: "delivered",
    })
    .where(
      and(
        eq(HackathonEventReminderDelivery.id, deliveryId),
        eq(HackathonEventReminderDelivery.state, "delivering"),
      ),
    );
}

export async function failHackathonEventReminderDelivery({
  code,
  deliveryId,
  state,
}: {
  code: string;
  deliveryId: string;
  state: "error" | "unknown";
}) {
  const now = new Date();
  await db
    .update(HackathonEventReminderDelivery)
    .set({
      lastError: code.slice(0, 500),
      lockedAt: null,
      nextAttemptAt:
        state === "error" ? new Date(now.getTime() + RETRY_DELAY_MS) : null,
      state: state === "error" ? "failed" : "unknown",
    })
    .where(
      and(
        eq(HackathonEventReminderDelivery.id, deliveryId),
        eq(HackathonEventReminderDelivery.state, "delivering"),
      ),
    );
}
