import { cookies } from "next/headers";

import type { Session } from "@forge/auth/server";
import { auth as realAuth } from "@forge/auth/server";
import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import { User } from "@forge/db/schemas/auth";

import { env } from "~/env";

export const E2E_AUTH_COOKIE = "blade-e2e-user-id";

export function isE2EAuthEnabled() {
  return env.BLADE_E2E_AUTH === "true";
}

export function sanitizeE2ECallbackURL(callbackURL?: string | null) {
  if (!callbackURL) return "/dashboard";

  try {
    const resolved = new URL(callbackURL, "http://blade-e2e.local");

    if (resolved.origin !== "http://blade-e2e.local") return "/dashboard";
    if (!resolved.pathname.startsWith("/")) return "/dashboard";

    return `${resolved.pathname}${resolved.search}`;
  } catch {
    return "/dashboard";
  }
}

async function getE2ESession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(E2E_AUTH_COOKIE)?.value;

  if (!userId) return null;

  const user = await db.query.User.findFirst({
    where: eq(User.id, userId),
  });

  if (!user) return null;

  return {
    session: {
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      id: `e2e-session-${user.id}`,
      ipAddress: null,
      token: `e2e-token-${user.id}`,
      updatedAt: new Date(),
      userAgent: "blade-playwright",
      userId: user.id,
    },
    user: {
      createdAt: user.createdAt,
      discordUserId: user.discordUserId,
      email: user.email,
      emailVerified: user.emailVerified,
      id: user.id,
      image: user.image,
      name: user.name,
      updatedAt: user.updatedAt,
    },
  } as Session;
}

export async function auth() {
  if (isE2EAuthEnabled()) {
    return await getE2ESession();
  }

  return await realAuth();
}

export type { Session };
