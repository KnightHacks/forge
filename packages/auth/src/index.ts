import { createAuthClient } from "better-auth/react";

import { sanitizeCallbackURL } from "./callback-url";
import { env } from "./env";

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_BLADE_URL,
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

export const auth = async () => {
  const sess = await authClient.getSession();
  if (!sess.data) return null;
  return sess.data;
};

export const signIn = async (
  provider: string,
  { redirectTo }: { redirectTo: string },
) => {
  await authClient.signIn.social({
    provider: provider,
    callbackURL: sanitizeCallbackURL(redirectTo),
  });
};

export const signOut = async () => {
  await authClient.signOut();
  if (typeof window !== "undefined") window.location.reload();
};
