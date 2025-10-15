import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { api } from "~/trpc/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only guard /judge pages; allow the activation endpoint itself
  if (!pathname.startsWith("/judge")) return NextResponse.next();
  if (pathname.startsWith("/judge/activate")) return NextResponse.next();

  // Quick reject if no cookie at all
  const token = req.cookies.get("sessionToken")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Ask our validator API if the sessionToken is valid & unexpired
  const res = await api.judge.isJudge();

  if (res) return NextResponse.next();

  // Invalid/expired -> boot to home
  return NextResponse.redirect(new URL("/", req.url));
}

export const config = {
  matcher: ["/judge/:path*"],
};
