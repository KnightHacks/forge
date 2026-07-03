import { randomUUID } from "crypto";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";

import { db } from "@forge/db/client";
import { Account, Session, User, Verifications } from "@forge/db/schemas/auth";

import * as discord from "../../utils/src/discord";
import { authSharedEnv } from "./shared-env";

export interface ForgeAuthOptions {
  baseURL: string;
}

export const isSecureContext = authSharedEnv.NODE_ENV !== "development";

export function createForgeAuth({ baseURL }: ForgeAuthOptions) {
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: User,
        account: Account,
        session: Session,
        verification: Verifications,
      },
    }),
    secret: authSharedEnv.BETTER_AUTH_SECRET,

    session: {
      fields: {
        expiresAt: "expires",
        token: "sessionToken",
      },
    },

    account: {
      fields: {
        accountId: "providerAccountId",
        providerId: "provider",
        refreshToken: "refresh_token",
        accessToken: "access_token",
        accessTokenExpiresAt: "expires_at",
        idToken: "id_token",
      },
    },

    socialProviders: {
      discord: {
        clientId: authSharedEnv.DISCORD_CLIENT_ID,
        clientSecret: authSharedEnv.DISCORD_CLIENT_SECRET,
        scope: ["guilds.join"],
        mapProfileToUser: (profile) => ({
          id: randomUUID(),
          name: profile.username,
          email: profile.id + "@blade.org",
          image: profile.avatar ?? "",
          emailVerified: profile.verified || false,
          discordUserId: profile.id,
        }),
      },
    },

    databaseHooks: {
      session: {
        create: {
          after: async (session) => {
            try {
              const user = await db.query.User.findFirst({
                where: eq(User.id, session.userId),
              });

              if (user?.discordUserId) {
                await discord.handleDiscordOAuthCallback(user.discordUserId);
              }
            } catch (error) {
              // eslint-disable-next-line no-console
              console.error("Error in Discord auto join hook:", error);
            }
          },
        },
      },
    },

    baseURL,
    user: {
      additionalFields: {
        discordUserId: {
          type: "string",
          required: true,
        },
      },
    },

    advanced: {
      useSecureCookies: isSecureContext,
      database: {
        generateId: () => randomUUID(),
      },
    },
  });
}

export type ForgeAuthInstance = ReturnType<typeof createForgeAuth>;
export type ForgeAuthSession = Omit<
  ForgeAuthInstance["$Infer"]["Session"],
  "user"
> & {
  user: ForgeAuthInstance["$Infer"]["Session"]["user"] & {
    discordUserId: string;
  };
};
