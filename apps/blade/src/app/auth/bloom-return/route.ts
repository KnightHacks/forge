import { NextResponse } from "next/server";

import { sanitizeCallbackURL } from "@forge/auth/callback-url";

import { env } from "~/env";

export function GET(request: Request) {
  if (env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }

  const requestUrl = new URL(request.url);
  const bloomOrigin = new URL(env.BLOOMKNIGHTS_URL).origin;
  const returnPath = sanitizeCallbackURL(
    requestUrl.searchParams.get("returnTo"),
    bloomOrigin,
    "/dashboard",
  );
  const returnTo = new URL(returnPath, bloomOrigin);

  if (requestUrl.searchParams.has("authError")) {
    returnTo.searchParams.set("authError", "oauth");
  }

  return NextResponse.redirect(returnTo);
}
