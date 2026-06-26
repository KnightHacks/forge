// apps/blade/app/api/judge/session/route.ts
import { NextResponse } from "next/server";

import * as permissionsServer from "@forge/utils/permissions.server";

export async function GET() {
  const row = await permissionsServer.getJudgeSessionFromCookie();
  if (!row) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, roomName: row.roomName });
}
