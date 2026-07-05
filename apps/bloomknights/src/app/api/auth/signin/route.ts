import { NextResponse } from "next/server";

import { sanitizeCallbackURL } from "@forge/auth/callback-url";

import { env } from "~/env";

export function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const provider = requestUrl.searchParams.get("provider");
  if (provider !== "discord") {
    return NextResponse.json(
      { error: "Unsupported provider parameter" },
      { status: 400 },
    );
  }

  const callbackPath = sanitizeCallbackURL(
    requestUrl.searchParams.get("callbackURL"),
    env.BLOOMKNIGHTS_URL,
    "/dashboard",
  );
  const returnTo = new URL(callbackPath, env.BLOOMKNIGHTS_URL);
  const bridgeUrl = new URL("/auth/bloom-return", env.BLADE_URL);
  bridgeUrl.searchParams.set("returnTo", returnTo.toString());

  const bladeSignInUrl = new URL("/api/auth/signin", env.BLADE_URL);
  bladeSignInUrl.searchParams.set("provider", "discord");
  bladeSignInUrl.searchParams.set(
    "callbackURL",
    `${bridgeUrl.pathname}${bridgeUrl.search}`,
  );

  return NextResponse.redirect(bladeSignInUrl);
}
