import type {
  DefaultSession,
  NextAuthConfig,
  Session as NextAuthSession,
} from "next-auth";
import type { DiscordProfile } from "next-auth/providers/discord";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Discord from "next-auth/providers/discord";

import { db } from "@forge/db/client";
import { Account, Session, User } from "@forge/db/schemas/auth";

import { env } from "./env";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      discordUserId: string;
    } & DefaultSession["user"];
  }
  interface User {
    discordUserId: string;
  }
}

const adapter = DrizzleAdapter(db, {
  usersTable: User,
  accountsTable: Account,
  sessionsTable: Session,
});

export const isSecureContext = env.NODE_ENV !== "development";

export const authConfig = {
  adapter,
  providers: [
    Discord({
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
      profile: (profile: DiscordProfile) => {
        return {
          discordUserId: profile.id,
          name: profile.username,
          email: profile.email ?? "",
          image: profile.avatar,
          id: profile.id,
        };
      },
    }),
  ],
  callbacks: {
    session: (opts) => {
      console.log("Opts: ", opts);
      if (!("user" in opts))
        throw new Error("unreachable with session strategy");
      return {
        ...opts.session,
        user: {
          ...opts.session.user,
          id: opts.user.id,
          discordUserId: opts.user.discordUserId,
        },
      };
    },
  },
} satisfies NextAuthConfig;

export const validateToken = async (
  token: string,
): Promise<NextAuthSession | null> => {
  const sessionToken = token.slice("Bearer ".length);
  const session = await adapter.getSessionAndUser?.(sessionToken);
  return session
    ? {
        user: {
          ...session.user,
        },
        expires: session.session.expires.toISOString(),
      }
    : null;
};

export const invalidateSessionToken = async (token: string) => {
  const sessionToken = token.slice("Bearer ".length);
  await adapter.deleteSession?.(sessionToken);
};
