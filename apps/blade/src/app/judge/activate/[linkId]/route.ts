import { NextResponse } from "next/server";

import type { RoomActivationResult } from "@forge/api/judging-access.server";
import { activateJudgingRoom } from "@forge/api/judging-access.server";
import {
  JUDGING_GUEST_COOKIE,
  JUDGING_GUEST_SESSION_SECONDS,
} from "@forge/auth/server";

import { env } from "~/env";
import { auth } from "~/server/auth";

export const runtime = "nodejs";

function projectsRedirect(request: Request, result: RoomActivationResult) {
  const url = new URL("/judge/projects", request.url);
  if (result.kind === "member") {
    url.searchParams.set("challenge", result.challengeId);
  }
  return NextResponse.redirect(url);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ linkId: string }> },
) {
  const { linkId } = await params;
  const signature = new URL(request.url).searchParams.get("signature") ?? "";
  try {
    const result = await activateJudgingRoom({
      linkId,
      session: await auth(),
      signature,
    });
    const response = projectsRedirect(request, result);
    response.headers.set("Cache-Control", "private, no-store");
    if (result.kind === "guest") {
      response.cookies.set(JUDGING_GUEST_COOKIE, result.credential, {
        httpOnly: true,
        maxAge: JUDGING_GUEST_SESSION_SECONDS,
        path: "/",
        sameSite: "lax",
        secure: env.NODE_ENV === "production",
      });
    }
    return response;
  } catch {
    const url = new URL("/judge/access-error", request.url);
    return NextResponse.redirect(url);
  }
}
