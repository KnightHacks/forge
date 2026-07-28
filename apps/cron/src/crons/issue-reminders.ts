import { Routes } from "discord-api-types/v10";

import { deliverIssueReminders } from "@forge/api/utils";
import { EVENTS } from "@forge/consts";
import { logger } from "@forge/utils";
import { api } from "@forge/utils/discord";

import { env } from "../env";
import { CronBuilder } from "../structs/CronBuilder";
import {
  issueReminderCcBody,
  issueReminderComponentsBody,
} from "./issue-reminder-delivery";

export const issueReminders = new CronBuilder({
  color: 2,
  name: "issue-reminders",
}).addCron(
  "0 9 * * *",
  async () => {
    const result = await deliverIssueReminders({
      bladeUrl: env.BLADE_URL,
      send: async (message) => {
        const { allowedMentions, channelId, content, embeds } = message;
        const components = "components" in message ? message.components : [];
        const componentsBody = issueReminderComponentsBody({
          allowedMentions,
          components,
          content,
          nodeEnv: env.NODE_ENV,
        });
        if (componentsBody) {
          await api.post(Routes.channelMessages(channelId), {
            body: componentsBody,
          });
          return;
        }
        if (embeds.length > 0) {
          await api.post(Routes.channelMessages(channelId), {
            body: { allowed_mentions: { parse: [] }, embeds },
          });
        }
        if (content) {
          await api.post(Routes.channelMessages(channelId), {
            body: issueReminderCcBody({
              allowedMentions,
              content,
              nodeEnv: env.NODE_ENV,
            }),
          });
        }
      },
    });
    logger.info(
      `Planned ${result.plannedTargets} issue reminder target(s); acquired ${result.deliveredTargets} delivery target(s).`,
    );
  },
  { timezone: EVENTS.CALENDAR_TIME_ZONE },
);
