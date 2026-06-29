"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { cn } from "@forge/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@forge/ui/dropdown-menu";

import type { AdminNavigationAccess } from "./admin-navigation";
import {
  getVisibleAdminNavigation,
  isAdminNavigationActive,
} from "./admin-navigation";

export function MobileAdminNavigation({
  access,
}: {
  access: AdminNavigationAccess;
}) {
  const pathname = usePathname();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-testid="mobile-admin-menu-trigger"
          aria-label="Open navigation menu"
          className="flex h-11 w-11 items-center justify-center rounded-md border border-primary/25 bg-primary/15 text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-52 border-border/70 bg-card/95 p-1.5 shadow-xl shadow-black/25 md:hidden"
      >
        <DropdownMenuLabel className="px-2 py-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Navigate
        </DropdownMenuLabel>
        {getVisibleAdminNavigation(access).map((item) => {
          const Icon = item.icon;
          const active = isAdminNavigationActive(item.id, pathname);
          return (
            <DropdownMenuItem
              key={item.id}
              asChild
              className={cn(
                "h-11 cursor-pointer gap-3 rounded-md px-3 font-medium",
                active && "bg-primary/15 text-foreground focus:bg-primary/15",
              )}
            >
              <Link href={item.href} aria-current={active ? "page" : undefined}>
                <Icon
                  className={cn("h-4 w-4", active && "text-primary")}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
                {active && (
                  <span
                    className="ml-auto h-1.5 w-1.5 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                )}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
