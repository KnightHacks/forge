import { createAuthClient } from "better-auth/react";

import { sanitizeCallbackURL } from "./callback-url";

export interface ForgeAuthClientOptions {
  baseURL?: string;
  defaultRedirectPath?: string;
}

export function createForgeAuthClient({
  baseURL,
  defaultRedirectPath = "/",
}: ForgeAuthClientOptions = {}) {
  const authClient = createAuthClient({
    ...(baseURL ? { baseURL } : {}),
    plugins: [
      {
        id: "discord-user",
        $InferServerPlugin: {} as {
          id: string;
          schema: {
            user: {
              fields: {
                discordUserId: { type: "string" };
              };
            };
          };
        },
      },
    ],
  });

  const resolveBaseURL = () =>
    baseURL ??
    (typeof window === "undefined"
      ? "http://localhost"
      : window.location.origin);

  const auth = async () => {
    const session = await authClient.getSession();
    return session.data ?? null;
  };

  const signIn = async (
    provider: string,
    { redirectTo }: { redirectTo: string },
  ) => {
    const callbackURL = sanitizeCallbackURL(
      redirectTo,
      resolveBaseURL(),
      defaultRedirectPath,
    );
    const errorURL = new URL(callbackURL, resolveBaseURL());
    errorURL.searchParams.set("authError", "oauth");

    await authClient.signIn.social({
      provider,
      callbackURL,
      errorCallbackURL: `${errorURL.pathname}${errorURL.search}`,
    });
  };

  const signOut = async ({ redirectTo = "/" } = {}) => {
    await authClient.signOut();
    if (typeof window !== "undefined") window.location.assign(redirectTo);
  };

  return { auth, authClient, signIn, signOut };
}
