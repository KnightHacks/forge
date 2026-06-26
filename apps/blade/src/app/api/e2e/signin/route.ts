import { NextResponse } from "next/server";

import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import { User } from "@forge/db/schemas/auth";

import { env } from "~/env";
import {
  E2E_AUTH_COOKIE,
  isE2EAuthEnabled,
  sanitizeE2ECallbackURL,
} from "~/server/auth";

export async function GET(req: Request) {
  if (!isE2EAuthEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const userId =
    url.searchParams.get("userId") ?? env.BLADE_E2E_DEFAULT_USER_ID;
  const callbackURL = sanitizeE2ECallbackURL(
    url.searchParams.get("callbackURL"),
  );

  if (!userId) {
    return NextResponse.json({ error: "Missing e2e user id" }, { status: 400 });
  }

  const user = await db.query.User.findFirst({
    where: eq(User.id, userId),
    columns: { id: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: "E2E user does not exist" },
      { status: 404 },
    );
  }

  const response = NextResponse.redirect(new URL(callbackURL, req.url));
  response.cookies.set(E2E_AUTH_COOKIE, user.id, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
  });

  return response;
}
