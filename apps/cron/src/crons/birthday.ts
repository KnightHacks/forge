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

const birthdayStrs = [
  `Happy Birthday, {{USERS}}
It's {{USERS}}'s birthday{{PLURAL}} today!`,

  `Happy Birthday, {{USERS}}
Today is all about {{USERS}}'s birthday{{PLURAL}}.`,

  `Happy Birthday, {{USERS}}
Wishing you a great {{USERS}}'s birthday{{PLURAL}}.`,

  `Happy Birthday, {{USERS}}
Hope {{USERS}}'s birthday{{PLURAL}} is full of fun.`,

  `Happy Birthday, {{USERS}}
Celebrating {{USERS}}'s birthday{{PLURAL}} today.`,

  `Happy Birthday, {{USERS}}
Another year, another {{USERS}}'s birthday{{PLURAL}}.`,

  `Happy Birthday, {{USERS}}
Yes, it's {{USERS}}'s birthday{{PLURAL}} again. It keeps happening.`,

  `Happy Birthday, {{USERS}}
Breaking news: it's {{USERS}}'s birthday{{PLURAL}}.`,

  `Happy Birthday, {{USERS}}
Hope {{USERS}}'s birthday{{PLURAL}} is a good one.`,

  `Happy Birthday, {{USERS}}
Make the most of {{USERS}}'s birthday{{PLURAL}}.`,

  `Happy Birthday, {{USERS}}
We checked. It is indeed {{USERS}}'s birthday{{PLURAL}}.`,

  `Happy Birthday, {{USERS}}
Sending good wishes for {{USERS}}'s birthday{{PLURAL}}.`,
];

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

    const birthdays = members.reduce<{ names: string[]; ids: string[] }>(
      (a, c) => {
        if (!c.discordId) return a;
        a.names.push(c.firstName + " " + c.lastName);
        a.ids.push(`<@{c.discordId}>`);
        return a;
      },
      { names: [], ids: [] },
    );
    if (!birthdays.ids.length) return;

    logger.log(`It is ${birthdays.names.join(" ")}'s birthdays today`);
    if (birthdays.ids.length > 1)
      birthdays.ids[birthdays.ids.length - 2] =
        birthdays.ids[birthdays.ids.length - 2] +
        (birthdays.ids.length >= 3 ? ", and" : " and");
    const usersStr = birthdays.ids.join(" ");
    const msg = birthdayStrs[Math.floor(Math.random() * birthdayStrs.length)]
      ?.replaceAll("{{USERS}}", usersStr)
      .replace("{{PLURAL}}", birthdays.ids.length > 1 ? "s" : "");

    if (!msg) {
      logger.log("Birthday message is empty for some reason!");
      logger.log(birthdays);
      return;
    }

    await BIRTHDAY_WEBHOOK.send(msg);
  },
);
