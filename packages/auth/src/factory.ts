import { randomUUID } from "crypto";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";

import { db } from "@forge/db/client";
import { Account, Session, User, Verifications } from "@forge/db/schemas/auth";
import * as discord from "@forge/utils/discord";

import { authSharedEnv } from "./shared-env";

export interface ForgeAuthOptions {
  baseURL: string;
}

const SHARED_AUTH_COOKIE_DOMAIN = ".knighthacks.org";

export const isSecureContext = authSharedEnv.NODE_ENV !== "development";

function getCrossSubDomainCookies(baseURL: string) {
  if (authSharedEnv.NODE_ENV !== "production") return undefined;

  const { hostname } = new URL(baseURL);
  if (
    hostname !== "knighthacks.org" &&
    !hostname.endsWith(SHARED_AUTH_COOKIE_DOMAIN)
  ) {
    return undefined;
  }

  return {
    enabled: true,
    domain: SHARED_AUTH_COOKIE_DOMAIN,
  };
}

export function createForgeAuth({ baseURL }: ForgeAuthOptions) {
  const crossSubDomainCookies = getCrossSubDomainCookies(baseURL);

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
      ...(crossSubDomainCookies ? { crossSubDomainCookies } : {}),
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
