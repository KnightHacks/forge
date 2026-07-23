import { Routes } from "discord-api-types/v10";

import { deliverIssueReminders } from "@forge/api/utils";
import { logger } from "@forge/utils";
import { api } from "@forge/utils/discord";

import { env } from "../env";
import { CronBuilder } from "../structs/CronBuilder";

export const issueReminders = new CronBuilder({
  color: 2,
  name: "issue-reminders",
}).addCron(
  "0 9 * * *",
  async () => {
    const result = await deliverIssueReminders({
      bladeUrl: env.BLADE_URL,
      send: async ({ allowedMentions, channelId, content }) => {
        await api.post(Routes.channelMessages(channelId), {
          body: { allowed_mentions: allowedMentions, content },
        });
      },
    });
    logger.info(
      `Planned ${result.plannedTargets} issue reminder target(s); acquired ${result.deliveredTargets} delivery target(s).`,
    );
  },
  { timezone: "America/New_York" },
);
