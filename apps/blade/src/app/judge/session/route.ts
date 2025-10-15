// apps/blade/app/api/judge/session/route.ts
import { NextResponse } from "next/server";
import { getJudgeSessionFromCookie } from "../../../../../../packages/api/src/routers/judge-auth";

export async function GET() {
  const row = await getJudgeSessionFromCookie();
  if (!row) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, roomName: row.roomName });
}
