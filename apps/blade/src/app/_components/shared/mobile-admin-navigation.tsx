"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ExternalLink, Menu } from "lucide-react";

import { cn } from "@forge/ui";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@forge/ui/sheet";

import type {
  AdminNavigationAccess,
  NavigationDestination,
} from "./admin-navigation";
import {
  RouteTransitionLink as Link,
  useNavigationPathname,
} from "~/app/_components/shared/route-transition-link";
import {
  getAdminNavigationGroups,
  isAdminNavigationActive,
  memberNavigationItems,
} from "./admin-navigation";

export function MobileAdminNavigation({
  access,
}: {
  access: AdminNavigationAccess;
}) {
  const pathname = usePathname();
  const navigationPathname = useNavigationPathname();
  const [open, setOpen] = useState(false);

  const renderItem = (item: NavigationDestination) => {
    const Icon = item.icon;
    const active = isAdminNavigationActive(item.id, navigationPathname);
    const contents = (
      <>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md border border-transparent bg-background/70",
            active && "border-primary/25 bg-primary/15 text-primary",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {item.external ? (
          <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
        ) : null}
      </>
    );
    const className = cn(
      "flex min-h-12 w-full items-center gap-3 rounded-lg border border-transparent px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors",
      "hover:border-white/10 hover:bg-background/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      active && "border-primary/25 bg-primary/10 text-foreground",
    );

    if (item.external) {
      return (
        <a
          key={item.id}
          href={item.href}
          target="_blank"
          rel="noreferrer"
          aria-label={`${item.label} (opens in a new tab)`}
          className={className}
          onClick={() => setOpen(false)}
        >
          {contents}
        </a>
      );
    }

    return (
      <Link
        key={item.id}
        href={item.href}
        aria-current={
          isAdminNavigationActive(item.id, pathname) ? "page" : undefined
        }
        className={className}
        onClick={() => setOpen(false)}
      >
        {contents}
      </Link>
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          data-testid="mobile-admin-menu-trigger"
          aria-label="Open navigation menu"
          className="flex h-11 w-11 items-center justify-center rounded-md border border-primary/25 bg-primary/15 text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </SheetTrigger>
      <SheetContent
        data-testid="mobile-navigation-drawer"
        side="top"
        className="flex h-[100svh] w-full flex-col gap-0 border-b border-border/70 bg-card/95 p-0 shadow-2xl shadow-black/35 md:hidden"
      >
        <SheetHeader className="border-b border-border/70 px-4 py-4 pr-14 text-left">
          <SheetTitle className="flex items-center gap-2">
            <Menu className="size-5 text-primary" aria-hidden="true" />
            Navigation
          </SheetTitle>
          <SheetDescription>
            Move between your member and administration workspaces.
          </SheetDescription>
        </SheetHeader>

        <nav
          aria-label="Mobile primary navigation"
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
            {memberNavigationItems.map(renderItem)}
            {getAdminNavigationGroups(access).map((group) => (
              <div
                key={group.label}
                role="group"
                aria-label={group.label}
                className="space-y-1 border-t border-border/70 pt-2"
              >
                <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                {group.items.map(renderItem)}
              </div>
            ))}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
