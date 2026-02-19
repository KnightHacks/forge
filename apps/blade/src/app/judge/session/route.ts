// apps/blade/app/api/judge/session/route.ts
import { NextResponse } from "next/server";

import { permissions } from "@forge/utils";

export async function GET() {
  const row = await permissions.getJudgeSessionFromCookie();
  if (!row) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, roomName: row.roomName });
}
