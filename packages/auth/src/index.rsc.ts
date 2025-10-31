import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";

import {
  auth as betterAuthInstance,
  invalidateSessionToken,
  isSecureContext,
  validateToken,
} from "./config";

export { validateToken, invalidateSessionToken, isSecureContext };

export type Session = Omit<typeof betterAuthInstance.$Infer.Session, "user"> & {
  user: (typeof betterAuthInstance.$Infer.Session)["user"] & {
    discordUserId: string;
  };
};

export const handlers = toNextJsHandler(betterAuthInstance);

export const auth = async () => {
  try {
    const headersList = headers();
    const sess = await betterAuthInstance.api.getSession({
      headers: headersList,
    });
    return sess;
  } catch {
    return null;
  }
};

export async function signInRoute(req: Request) {
  const url = new URL(req.url);
  const provider = url.searchParams.get("provider");
  const callbackURL = url.searchParams.get("callbackURL") ?? "/dashboard";

  if (!provider) {
    return NextResponse.json(
      { error: "Missing provider parameter" },
      { status: 400 },
    );
  }

  // Call Better Auth API
  const res = await betterAuthInstance.api.signInSocial({
    body: {
      provider,
      callbackURL,
    },
    asResponse: true,
  });

  const data = (await res.json()) as { url?: string };
  if (!data.url) {
    return NextResponse.json(
      { error: "Failed to get redirect URL from Better Auth" },
      { status: 500 },
    );
  }

  // Forward cookies and redirect
  const response = NextResponse.redirect(data.url);
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) response.headers.set("set-cookie", setCookie);

  return response;
}

export const signIn = (
  provider: string,
  { redirectTo }: { redirectTo: string },
) => {
  redirect(`/api/auth/signin?provider=${provider}&callbackURL=${redirectTo}`);
};
