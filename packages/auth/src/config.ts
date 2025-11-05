import { randomUUID } from "crypto";
import { headers } from "next/headers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "@forge/db/client";
import { Account, Session, User, Verifications } from "@forge/db/schemas/auth";

import { env } from "./env";

export const isSecureContext = env.NODE_ENV !== "development";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: User,
      account: Account,
      session: Session,
      verification: Verifications,
    },
  }),
  secret: env.BETTER_AUTH_SECRET,

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
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
      mapProfileToUser: (profile) => {
        return {
          id: randomUUID(),
          name: profile.global_name ?? profile.username,
          email: profile.email,
          image: profile.avatar ?? "",
          emailVerified: profile.verified || false,
          discordUserId: profile.id,
        };
      },
    },
  },

  baseURL:
    env.NODE_ENV === "production" ? env.BLADE_URL : "http://localhost:3000",
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

export const validateToken = async () => {
  const headersList = headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) return null;
  return {
    user: session.user,
    session: session.session,
    expires: session.session.expiresAt.toISOString(),
  };
};

export const invalidateSessionToken = async (token: string) => {
  const sessionToken = token.replace(/^Bearer\s+/i, "");
  await auth.api.revokeSession({
    body: { token: sessionToken },
    headers: new Headers({ Authorization: `Bearer ${sessionToken}` }),
  });
};
