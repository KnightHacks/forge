"use client";

import { usePathname } from "next/navigation";

import WispCursor from "./WispCursor";

const PORTAL_PATHS = ["/apply", "/dashboard", "/hacker/application"];

export function MarketingWispCursor() {
  const pathname = usePathname();
  if (PORTAL_PATHS.some((path) => pathname.startsWith(path))) return null;
  return <WispCursor />;
}
