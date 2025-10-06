import type { TRPCError } from "@trpc/server";
import { NextResponse } from "next/server";

import { api } from "~/trpc/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "❌ Missing token" }, { status: 400 });
  }

  try {
    await api.judge.activateToken({ token });
    return NextResponse.redirect(new URL("/judge", req.url));
  } catch (err) {
    return NextResponse.json(
      { error: (err as TRPCError).message },
      { status: 400 },
    );
  }
}
