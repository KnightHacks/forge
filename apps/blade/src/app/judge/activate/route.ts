// app/api/activate/route.ts
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
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Invalid or expired token" },
      { status: 400 },
    );
  }
}
