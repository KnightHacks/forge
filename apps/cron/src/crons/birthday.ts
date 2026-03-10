import { WebhookClient } from "discord.js";
import { and, eq, exists, sql } from "drizzle-orm";

import { db } from "@forge/db/client";
import { Permissions, User } from "@forge/db/schemas/auth";
import { Member } from "@forge/db/schemas/knight-hacks";
import { logger } from "@forge/utils";

import { env } from "../env";
import { CronBuilder } from "../structs/CronBuilder";

const BIRTHDAY_WEBHOOK = new WebhookClient({
  url: env.DISCORD_WEBHOOK_BIRTHDAY,
});

export const birthday = new CronBuilder({
  name: "birthday",
  color: 7,
}).addCron(
  "0 12 * * *", // every day at 12 (noon!)
  async () => {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const members = await db
      .select({
        firstName: Member.firstName,
        lastName: Member.lastName,
        guildProfileVisible: Member.guildProfileVisible,
        discordId: User.discordUserId,
      })
      .from(Member)
      .leftJoin(User, eq(User.id, Member.userId))
      .where(
        and(
          exists(
            // can be removed if we want to open to full member list
            db
              .select()
              .from(Permissions)
              .where(eq(Permissions.userId, Member.userId)),
          ),
          eq(Member.guildProfileVisible, true),
          eq(sql`EXTRACT(MONTH FROM ${Member.dob})`, month),
          eq(sql`EXTRACT(DAY FROM ${Member.dob})`, day),
        ),
      );

    for (const u of members) {
      logger.log(`${u.firstName} ${u.lastName}'s birthday today!`);
      await BIRTHDAY_WEBHOOK.send(`Happy Birthday, <@${u.discordId}>`);
    }
  },
);
