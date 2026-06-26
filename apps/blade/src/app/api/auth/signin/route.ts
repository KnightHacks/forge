import { NextResponse } from "next/server";

import { signInRoute } from "@forge/auth/server";

import { env } from "~/env";
import { isE2EAuthEnabled, sanitizeE2ECallbackURL } from "~/server/auth";

export async function GET(req: Request) {
  if (!isE2EAuthEnabled()) return await signInRoute(req);

  const url = new URL(req.url);
  const provider = url.searchParams.get("provider");
  const userId =
    url.searchParams.get("userId") ?? env.BLADE_E2E_DEFAULT_USER_ID;

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

  if (!userId) {
    return NextResponse.json({ error: "Missing e2e user id" }, { status: 400 });
  }

  const signInUrl = new URL("/api/e2e/signin", url);
  signInUrl.searchParams.set("userId", userId);
  signInUrl.searchParams.set(
    "callbackURL",
    sanitizeE2ECallbackURL(url.searchParams.get("callbackURL")),
  );

  return NextResponse.redirect(signInUrl);
}
