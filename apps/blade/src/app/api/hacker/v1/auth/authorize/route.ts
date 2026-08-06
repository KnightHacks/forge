import { NextResponse } from "next/server";

import {
  databasePortalSessionStore,
  isAllowedPortalCallback,
  PortalAuthError,
} from "@forge/auth/server";
import { portalAuthorizationRequestSchema } from "@forge/validators";

import { env } from "~/env";
import { auth } from "~/server/auth";
import { portalAuthErrorResponse, portalSessionService } from "../shared";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = portalAuthorizationRequestSchema.safeParse({
      clientId: url.searchParams.get("client_id"),
      codeChallenge: url.searchParams.get("code_challenge"),
      codeChallengeMethod: url.searchParams.get("code_challenge_method"),
      redirectUri: url.searchParams.get("redirect_uri"),
      state: url.searchParams.get("state"),
    });
    if (!parsed.success) throw new PortalAuthError("INVALID_GRANT");
    const {
      clientId,
      codeChallenge: challenge,
      redirectUri,
      state,
    } = parsed.data;

    const client = await databasePortalSessionStore.findClient(clientId);
    if (!client?.enabled) throw new PortalAuthError("INVALID_CLIENT");
    if (
      !isAllowedPortalCallback({
        callbackURL: redirectUri,
        environment:
          env.NODE_ENV === "development" ? "development" : "production",
        registeredOrigin: client.origin,
      })
    ) {
      throw new PortalAuthError("INVALID_CALLBACK");
    }

    const session = await auth();
    if (!session) {
      const signIn = new URL("/api/auth/signin", url.origin);
      signIn.searchParams.set("provider", "discord");
      signIn.searchParams.set("callbackURL", `${url.pathname}${url.search}`);
      return NextResponse.redirect(signIn);
    }

    const { code } = await portalSessionService.issueAuthorizationCode({
      clientId,
      redirectUri,
      pkceChallenge: challenge,
      userId: session.user.id,
      betterAuthSessionId: session.session.id,
    });
    const callback = new URL(redirectUri);
    callback.searchParams.set("code", code);
    callback.searchParams.set("state", state);
    return NextResponse.redirect(callback);
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}
