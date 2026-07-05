import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";

import type { ForgeAuthSession } from "./factory";
import { sanitizeCallbackURL } from "./callback-url";
import { createForgeAuth, isSecureContext } from "./factory";

export interface ForgeAuthServerOptions {
  baseURL: string;
  defaultRedirectPath?: string;
}

export function createForgeAuthServer({
  baseURL,
  defaultRedirectPath = "/",
}: ForgeAuthServerOptions) {
  const authInstance = createForgeAuth({ baseURL });
  const handlers = toNextJsHandler(authInstance);

  const auth = async () => {
    try {
      return await authInstance.api.getSession({ headers: await headers() });
    } catch {
      return null;
    }
  };

  const validateToken = async (): Promise<ForgeAuthSession | null> => {
    const session = await auth();
    if (!session) return null;

    return {
      user: session.user,
      session: session.session,
      expires: session.session.expiresAt.toISOString(),
    } as ForgeAuthSession;
  };

  const invalidateSessionToken = async (token: string) => {
    const sessionToken = token.replace(/^Bearer\s+/i, "");
    await authInstance.api.revokeSession({
      body: { token: sessionToken },
      headers: new Headers({ Authorization: `Bearer ${sessionToken}` }),
    });
  };

  const signInRoute = async (req: Request) => {
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider");
    const callbackURL = sanitizeCallbackURL(
      url.searchParams.get("callbackURL"),
      baseURL,
      defaultRedirectPath,
    );
    const errorURL = new URL(callbackURL, baseURL);
    errorURL.searchParams.set("authError", "oauth");
    const errorCallbackURL = `${errorURL.pathname}${errorURL.search}`;

    if (!provider) {
      return NextResponse.json(
        { error: "Missing provider parameter" },
        { status: 400 },
      );
    }

    if (provider !== "discord") {
      return NextResponse.json(
        { error: "Unsupported provider parameter" },
        { status: 400 },
      );
    }

    const response = await authInstance.api.signInSocial({
      body: { provider, callbackURL, errorCallbackURL },
      asResponse: true,
    });
    const data = (await response.json()) as { url?: string };

    if (!data.url) {
      return NextResponse.json(
        { error: "Failed to get redirect URL from Better Auth" },
        { status: 500 },
      );
    }

    const redirectResponse = NextResponse.redirect(data.url);
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) redirectResponse.headers.set("set-cookie", setCookie);
    return redirectResponse;
  };

  const signIn = (provider: string, { redirectTo }: { redirectTo: string }) => {
    const callbackURL = sanitizeCallbackURL(
      redirectTo,
      baseURL,
      defaultRedirectPath,
    );
    redirect(
      `${baseURL}/api/auth/signin?provider=${encodeURIComponent(provider)}&callbackURL=${encodeURIComponent(callbackURL)}`,
    );
  };

  return {
    auth,
    authInstance,
    handlers,
    invalidateSessionToken,
    isSecureContext,
    signIn,
    signInRoute,
    validateToken,
  };
}
