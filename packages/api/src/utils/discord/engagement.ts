import { EVENTS } from "@forge/consts";
import { and, asc, desc, eq, isNull, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { User } from "@forge/db/schemas/auth";
import {
  DiscordArchiveChannel,
  DiscordArchiveMessage,
} from "@forge/db/schemas/discord";

/**
 * The calendar day a timestamp falls on, in the club's own time zone.
 *
 * Moved here with the engagement query it serves. Bucketing by UTC would put a
 * 9pm Orlando message on the following day, which shifts the activity heatmap by
 * one column for every evening — which is most of them.
 */
export function dateInCalendarTimeZone(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: EVENTS.CALENDAR_TIME_ZONE,
    year: "numeric",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/**
 * Discord activity for one Blade account.
 *
 * Extracted from the member dashboard because the hacker detail panel needs the
 * same thing for the same reason: an organiser chasing an applicant whose email
 * bounced wants to know whether that person is active in the server, and where.
 * It reads only from a `userId`, so it needs no tRPC context and both routers
 * can call it.
 */
export async function getDiscordEngagement(userId: string, now = new Date()) {
  const user = await db.query.User.findFirst({
    columns: { discordUserId: true },
    where: eq(User.id, userId),
  });
  if (!user) {
    return {
      activity: [],
      activityEndDate: dateInCalendarTimeZone(now),
      activeChannelCount: 0,
      activeDayCount: 0,
      firstMessageAt: null,
      lastMessageAt: null,
      messageCount: 0,
      topChannels: [],
    };
  }

  const activityEndDate = dateInCalendarTimeZone(now);
  const humanMessageConditions = [
    eq(DiscordArchiveMessage.authorDiscordUserId, user.discordUserId),
    isNull(DiscordArchiveMessage.deletedAt),
    eq(DiscordArchiveMessage.authorIsBot, false),
    isNull(DiscordArchiveMessage.webhookId),
    isNull(DiscordArchiveMessage.applicationId),
    eq(DiscordArchiveMessage.messageType, 0),
  ] as const;

  const [summaryRows, activityRows, topChannels] = await Promise.all([
    db
      .select({
        activeChannelCount: sql<number>`count(distinct ${DiscordArchiveMessage.channelId})::int`,
        activeDayCount: sql<number>`count(distinct (${DiscordArchiveMessage.createdAt} at time zone ${EVENTS.CALENDAR_TIME_ZONE})::date)::int`,
        firstMessageAt: sql<Date | null>`min(${DiscordArchiveMessage.createdAt})`,
        lastMessageAt: sql<Date | null>`max(${DiscordArchiveMessage.createdAt})`,
        messageCount: sql<number>`count(*)::int`,
      })
      .from(DiscordArchiveMessage)
      .where(and(...humanMessageConditions)),
    db
      .select({
        count: sql<number>`count(*)::int`,
        date: sql<string>`to_char(${DiscordArchiveMessage.createdAt} at time zone ${EVENTS.CALENDAR_TIME_ZONE}, 'YYYY-MM-DD')`,
      })
      .from(DiscordArchiveMessage)
      .where(and(...humanMessageConditions))
      .groupBy(sql`2`)
      .orderBy(sql`2`),
    db
      .select({
        count: sql<number>`count(*)::int`,
        isThread: DiscordArchiveChannel.isThread,
        name: DiscordArchiveChannel.name,
      })
      .from(DiscordArchiveMessage)
      .innerJoin(
        DiscordArchiveChannel,
        eq(DiscordArchiveChannel.id, DiscordArchiveMessage.channelId),
      )
      .where(and(...humanMessageConditions))
      .groupBy(
        DiscordArchiveChannel.id,
        DiscordArchiveChannel.isThread,
        DiscordArchiveChannel.name,
      )
      .orderBy(
        desc(sql<number>`count(*)::int`),
        asc(DiscordArchiveChannel.name),
      )
      .limit(5),
  ]);
  const summary = summaryRows[0];

  return {
    activity: activityRows,
    activityEndDate,
    activeChannelCount: summary?.activeChannelCount ?? 0,
    activeDayCount: summary?.activeDayCount ?? 0,
    firstMessageAt: summary?.firstMessageAt ?? null,
    lastMessageAt: summary?.lastMessageAt ?? null,
    messageCount: summary?.messageCount ?? 0,
    topChannels,
  };
}
