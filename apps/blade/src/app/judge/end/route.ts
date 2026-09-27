import { NextResponse } from "next/server";

import { JUDGING_GUEST_COOKIE } from "@forge/auth/server";

export function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete(JUDGING_GUEST_COOKIE);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
