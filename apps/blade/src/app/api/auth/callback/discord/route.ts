import { handlers } from "@forge/auth/server";
import type { NextRequest } from "next/server";
import { handleDiscordOAuthCallback } from "@forge/api/utils";
import { db } from "@forge/db/client";
import { Account } from "@forge/db/schemas/auth";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const response = await handlers.GET(req);

  if (response.status === 302) {
    try {
      const recentAccount = await db.query.Account.findFirst({
        where: eq(Account.provider, "discord"),
        orderBy: [desc(Account.updatedAt)],
        with: {
          user: true,
        },
      });

      const discordUserId = recentAccount?.user.discordUserId;

      if (discordUserId) {
        void handleDiscordOAuthCallback(discordUserId);
      }
    } catch (err) {
      console.error(
        "Error in Discord callback handler:",
        err,
      );
    }
  }

  return response;
}