import { NextResponse } from "next/server";

import { E2E_AUTH_COOKIE, isE2EAuthEnabled } from "~/server/auth";

export function POST() {
  if (!isE2EAuthEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const response = new NextResponse(null, { status: 204 });
  response.cookies.delete(E2E_AUTH_COOKIE);

  return response;
}
