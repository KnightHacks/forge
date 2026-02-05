import { and, gt, isNotNull, isNull, lte, or } from "drizzle-orm";

import {
  addRoleToMember,
  removeRoleFromMember,
  resolveDiscordUserId,
} from "@forge/api/utils";
import { db } from "@forge/db/client";
import { Member } from "@forge/db/schemas/knight-hacks";

const ALUMNI_PROD_ROLE = "486629512101232661";

async function syncAlumniRoles() {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // Add role to members whos grad date has passed
    const graduatedMembers = await db
      .select({ discordUser: Member.discordUser })
      .from(Member)
      .where(and(lte(Member.gradDate, today), isNotNull(Member.discordUser)));

    for (const { discordUser } of graduatedMembers) {
      try {
        const discordId = await resolveDiscordUserId(discordUser);
        if (discordId) await addRoleToMember(discordId, ALUMNI_PROD_ROLE);
      } catch (err) {
        console.error(`Failed to add alumni role for ${discordUser}:`, err);
      }
    }

    // Remove role from members whos grad date hasnt passed
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
        if (discordId) await removeRoleFromMember(discordId, ALUMNI_PROD_ROLE);
      } catch (err) {
        console.error(`Failed to remove alumni role for ${discordUser}:`, err);
      }
    }

    console.log("Alumni discord role sync completed successfully.");
  } catch (err) {
    console.error("Unexpected error during alumni discord role sync:", err);
  }
}

export { syncAlumniRoles };
