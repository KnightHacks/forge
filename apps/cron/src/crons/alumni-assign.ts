import { and, gt, isNotNull, isNull, lte, or } from "drizzle-orm";

import {
  addRoleToMember,
  removeRoleFromMember,
  resolveDiscordUserId,
} from "@forge/api/utils";
import { PROD_ALUMNI_ROLE_ID } from "@forge/consts/knight-hacks";
import { db } from "@forge/db/client";
import { Member } from "@forge/db/schemas/knight-hacks";

import { CronBuilder } from "../structs/CronBuilder";

export const alumniAssign = new CronBuilder({
  name: "alumni",
  color: 3,
}).addCron(
  "0 8 * * *", // every day 8am
  async () => {
    const today = new Date().toISOString().slice(0, 10);

    // Add role to members whose grad date has passed
    const graduatedMembers = await db
      .select({ discordUser: Member.discordUser })
      .from(Member)
      .where(and(lte(Member.gradDate, today), isNotNull(Member.discordUser)));

    for (const { discordUser } of graduatedMembers) {
      try {
        const discordId = await resolveDiscordUserId(discordUser);
        if (discordId) await addRoleToMember(discordId, PROD_ALUMNI_ROLE_ID);
      } catch (err) {
        console.error(`Failed to add alumni role for ${discordUser}:`, err);
      }
    }

    // Remove role from members whose grad date hasn't passed
    // NOTE: Discord API v10 means we cant grab all discord users with the
    // alumni role in the server. So this was the workaround :/
    const nonGraduatedMembers = await db
      .select({ discordUser: Member.discordUser })
      .from(Member)
      .where(
        and(
          isNotNull(Member.discordUser),
          or(gt(Member.gradDate, today), isNull(Member.gradDate)),
        ),
      );

    for (const { discordUser } of nonGraduatedMembers) {
      try {
        const discordId = await resolveDiscordUserId(discordUser);
        if (discordId)
          await removeRoleFromMember(discordId, PROD_ALUMNI_ROLE_ID);
      } catch (err) {
        console.error(`Failed to remove alumni role for ${discordUser}:`, err);
      }
    }
  },
);
