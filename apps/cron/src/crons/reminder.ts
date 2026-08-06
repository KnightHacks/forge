import { Routes } from "discord-api-types/v10";
import { WebhookClient } from "discord.js";

import {
  claimHackathonEventReminderDeliveries,
  completeHackathonEventReminderDelivery,
  failHackathonEventReminderDelivery,
  selectClubReminderCandidates,
} from "@forge/api/utils";
import { EVENTS } from "@forge/consts";
import { api } from "@forge/utils/discord";

import { env } from "../env";
import { CronBuilder } from "../structs/CronBuilder";
import { createHackReminderExecutor } from "./hack-reminder-logic";
import { createClubReminderExecutor } from "./reminder-logic";

const REMINDERS_WEBHOOK = new WebhookClient({
  url: env.DISCORD_WEBHOOK_REMINDERS,
});
const REMINDERS_PRE_WEBHOOK = new WebhookClient({
  url: env.DISCORD_WEBHOOK_REMINDERS_PRE,
});
export const preReminders = new CronBuilder({
  name: "reminders/pre",
  color: 6,
}).addCron("0 8 * * *", genCronLogic(REMINDERS_PRE_WEBHOOK));

export const reminders = new CronBuilder({
  name: "reminders",
  color: 6,
}).addCron("0 11 * * *", genCronLogic(REMINDERS_WEBHOOK));

export const hackReminders = new CronBuilder({
  name: "reminders/hack",
  color: 6,
}).addCron(
  "* * * * *",
  createHackReminderExecutor({
    complete: completeHackathonEventReminderDelivery,
    fail: failHackathonEventReminderDelivery,
    getDeliveries: claimHackathonEventReminderDeliveries,
    now: () => new Date(),
    send: async (channelId, body) => {
      const response = await api.post(Routes.channelMessages(channelId), {
        body,
      });
      return response as { id?: string };
    },
  }),
  { timezone: EVENTS.CALENDAR_TIME_ZONE },
);

function genCronLogic(webhook: WebhookClient): () => Promise<void> {
  return createClubReminderExecutor({
    getCandidates: selectClubReminderCandidates,
    now: () => new Date(),
    send: (payload) => webhook.send(payload),
  });
}
