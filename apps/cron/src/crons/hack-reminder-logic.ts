import type { RESTPostAPIChannelMessageJSONBody } from "discord-api-types/v10";

import { reminderEventEmbed } from "./reminder-row";

export interface HackReminderDelivery {
  emoji?: string | null;
  channelId: string;
  deliveryId: string;
  description: string;
  discordEventId: string | null;
  endDateTime: Date | string;
  eventId: string;
  guildId: string;
  location: string;
  name: string;
  roleId: string;
  startDateTime: Date | string;
  tag: string;
}

export interface HackReminderFailure {
  code: string;
  deliveryId: string;
  state: "error" | "unknown";
}

export function buildHackReminderMessage(
  delivery: HackReminderDelivery,
): RESTPostAPIChannelMessageJSONBody {
  return {
    allowed_mentions: { parse: [], roles: [delivery.roleId] },
    content: `## Starting in about 15 minutes\ncc: <@&${delivery.roleId}>`,
    embeds: [
      reminderEventEmbed({
        ...delivery,
        url: delivery.discordEventId
          ? `https://discord.com/events/${delivery.guildId}/${delivery.discordEventId}`
          : null,
      }),
    ],
  };
}

function statusFromError(error: unknown) {
  if (!error || typeof error !== "object") return undefined;
  const status: unknown = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

/**
 * Discord 4xx responses are definite rejections. Timeouts, transport failures,
 * and 5xx responses are ambiguous because Discord may have accepted the POST.
 */
export function classifyHackReminderFailure(
  error: unknown,
): Pick<HackReminderFailure, "code" | "state"> {
  const status = statusFromError(error);
  if (status && status >= 400 && status < 500) {
    return { code: `discord_${status}`, state: "error" };
  }
  return {
    code: status ? `discord_${status}` : "discord_delivery_ambiguous",
    state: "unknown",
  };
}

export function createHackReminderExecutor({
  complete,
  fail,
  getDeliveries,
  now,
  send,
}: {
  complete: (deliveryId: string, messageId?: string) => Promise<void>;
  fail: (failure: HackReminderFailure) => Promise<void>;
  getDeliveries: (input: { now: Date }) => Promise<HackReminderDelivery[]>;
  now: () => Date;
  send: (
    channelId: string,
    body: RESTPostAPIChannelMessageJSONBody,
  ) => Promise<{ id?: string } | void>;
}) {
  return async () => {
    for (let processed = 0; processed < 100; processed += 1) {
      const [delivery] = await getDeliveries({ now: now() });
      if (!delivery) return;
      try {
        const response = await send(
          delivery.channelId,
          buildHackReminderMessage(delivery),
        );
        await complete(delivery.deliveryId, response?.id);
      } catch (error) {
        await fail({
          deliveryId: delivery.deliveryId,
          ...classifyHackReminderFailure(error),
        });
      }
    }
  };
}
