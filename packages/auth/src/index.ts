import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
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

export type Session = Omit<typeof authClient.$Infer.Session, "user"> & {
  user: (typeof authClient.$Infer.Session)["user"] & {
    discordUserId: string;
  };
};

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
    callbackURL: redirectTo,
  });
};

export const signOut = async () => {
  await authClient.signOut();
};

export const invalidateSessionToken = async (token: string) => {
  const sessionToken = token.replace(/^Bearer\s+/i, "");
  await authClient.revokeSession({
    token: sessionToken,
  });
};
