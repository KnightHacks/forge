import cron from "node-cron";
import { and, lte, isNotNull } from "drizzle-orm";
import { db } from "@forge/db/client";
import { Member } from "@forge/consts/db/src/schemas/knight-hacks";
import { KNIGHTHACKS_GUILD_ID as GUILD_ID, addRoleToMember, removeRoleFromMember, resolveDiscordUserId, discord } from "../../../../packages/api/src/utils";

const ALUMNI_DEV_ROLE_ID = "1433223673975668898"; 

// Fetch all members in the guild who currently have the alumni role
export async function getCurrentAlumniDiscordMembers(): Promise<string[]> {
  try {
    const response = (await discord.get(
      `/guilds/${GUILD_ID}/roles/${ALUMNI_DEV_ROLE_ID}/members`
    )) as { user: { id: string } }[];

    return response.map((member) => member.user.id);
  } catch (err) {
    console.error("Failed to fetch current alumni members from the Knight Hacks discord server:", err);
    return [];
  }
}

async function syncAlumniRoles() {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // Fetch graduated members from DB
    const graduatedMembers = await db
      .select({ discordUser: Member.discordUser })
      .from(Member)
      .where(and(lte(Member.gradDate, today), isNotNull(Member.discordUser)));

    if (!graduatedMembers.length) return;

    const graduatedDiscordIds: string[] = [];

    // Get discord ID from discord user
    for (const { discordUser } of graduatedMembers) {
      const discordId = await resolveDiscordUserId(discordUser);
      if (discordId) graduatedDiscordIds.push(discordId);
    }

    // Add alumni role to graduated members
    for (const discordId of graduatedDiscordIds) {
      try {
        await addRoleToMember(discordId, ALUMNI_DEV_ROLE_ID);
      } catch (err) {
        console.error(`Failed to add alumni role to ${discordId}:`, err);
      }
    }

    // Remove alumni role from members who changed grad date
    const currentAlumniDiscordIds = await getCurrentAlumniDiscordMembers();
    for (const discordId of currentAlumniDiscordIds) {
      if (!graduatedDiscordIds.includes(discordId)) {
        try {
          await removeRoleFromMember(discordId, ALUMNI_DEV_ROLE_ID);
        } catch (err) {
          console.error(`Failed to remove alumni role from ${discordId}:`, err);
        }
      }
    }

    console.log("Alumni Discord role sync completed successfully");
  } catch (err) {
    console.error("Unexpected error during alumni sync:", err);
  }
}

// Run every morning
cron.schedule("0 8 * * *", () => {
  void syncAlumniRoles();
});
