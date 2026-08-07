import { NextResponse } from "next/server";

import {
  databasePortalSessionStore,
  isAllowedPortalCallback,
  PortalAuthError,
} from "@forge/auth/server";
import { portalLogoutRequestSchema } from "@forge/validators";

import { env } from "~/env";
import { signOutSession } from "~/server/auth";
import { portalAuthErrorResponse } from "../shared";

export async function GET(request: Request) {
  try {
    if (request.headers.get("sec-fetch-site") === "cross-site") {
      throw new PortalAuthError("INVALID_GRANT");
    }

    const url = new URL(request.url);
    const parsed = portalLogoutRequestSchema.safeParse({
      clientId: url.searchParams.get("client_id"),
      returnTo: url.searchParams.get("return_to"),
    });
    if (!parsed.success) throw new PortalAuthError("INVALID_GRANT");

    const client = await databasePortalSessionStore.findClient(
      parsed.data.clientId,
    );
    if (!client) throw new PortalAuthError("INVALID_CLIENT");
    if (
      !isAllowedPortalCallback({
        callbackURL: parsed.data.returnTo,
        environment:
          env.NODE_ENV === "development" ? "development" : "production",
        registeredOrigin: client.origin,
      })
    ) {
      throw new PortalAuthError("INVALID_CALLBACK");
    }

    const signedOut = await signOutSession(request.headers);
    const response = NextResponse.redirect(parsed.data.returnTo);
    for (const setCookie of signedOut.headers.getSetCookie()) {
      response.headers.append("set-cookie", setCookie);
    }
    response.headers.set("cache-control", "private, no-store");
    return response;
  } catch (error) {
    return portalAuthErrorResponse(error);
  }
}
