"use client";

import { usePathname } from "next/navigation";

import { ThemeToggle } from "@forge/ui/theme";

export function ThemeToggleRouteGuard() {
  const pathname = usePathname();
  const hideThemeToggle =
    pathname === "/hacker/application" ||
    pathname.startsWith("/hacker/application/");

  if (hideThemeToggle) return null;

  return (
    <div className="fixed bottom-4 right-4">
      <ThemeToggle />
    </div>
  );
}
