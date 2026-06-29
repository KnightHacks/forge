"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@forge/ui";

import type { AdminNavigationAccess } from "./admin-navigation";
import {
  getVisibleAdminNavigation,
  isAdminNavigationActive,
} from "./admin-navigation";

export function DesktopAdminNavigation({
  access,
}: {
  access: AdminNavigationAccess;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-2 p-2" aria-label="Primary">
      {getVisibleAdminNavigation(access).map((item) => {
        const Icon = item.icon;
        const active = isAdminNavigationActive(item.id, pathname);
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-11 items-center gap-3 rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-primary/25 bg-primary/15 text-foreground"
                : "border-transparent text-muted-foreground hover:border-white/10 hover:bg-background/70 hover:text-foreground",
            )}
          >
            <Icon
              className={cn("h-5 w-5 min-w-5", active && "text-primary")}
              aria-hidden="true"
            />
            <span className="whitespace-nowrap opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
