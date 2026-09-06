"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ExternalLink, PanelLeft } from "lucide-react";

import { cn } from "@forge/ui";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@forge/ui/tooltip";

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

export function DesktopAdminNavigation({
  access,
}: {
  access: AdminNavigationAccess;
}) {
  const pathname = usePathname();
  const navigationPathname = useNavigationPathname();
  const [expanded, setExpanded] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  // Rail state is transient: any navigation, including back/forward, collapses it.
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setExpanded(false);
  }

  const renderItem = (item: NavigationDestination) => {
    const Icon = item.icon;
    const active = isAdminNavigationActive(item.id, navigationPathname);
    const className = cn(
      "flex h-11 items-center gap-3 rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      active
        ? "border-primary/25 bg-primary/15 text-foreground"
        : "border-transparent text-muted-foreground hover:border-white/10 hover:bg-background/70 hover:text-foreground",
    );
    const contents = (
      <>
        <Icon
          className={cn("h-5 w-5 min-w-5", active && "text-primary")}
          aria-hidden="true"
        />
        <span className={expanded ? "whitespace-nowrap" : "sr-only"}>
          {item.label}
        </span>
        {item.external ? (
          <ExternalLink
            className={cn("h-4 w-4 min-w-4", expanded ? "ml-auto" : "hidden")}
            aria-hidden="true"
          />
        ) : null}
      </>
    );

    const link = item.external ? (
      <a
        href={item.href}
        target="_blank"
        rel="noreferrer"
        aria-label={`${item.label} (opens in a new tab)`}
        className={className}
        onClick={() => setExpanded(false)}
      >
        {contents}
      </a>
    ) : (
      <Link
        href={item.href}
        aria-current={
          isAdminNavigationActive(item.id, pathname) ? "page" : undefined
        }
        className={className}
        onClick={() => setExpanded(false)}
      >
        {contents}
      </Link>
    );

    if (expanded) return <div key={item.id}>{link}</div>;

    return (
      <Tooltip key={item.id}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        data-testid="member-navigation-rail"
        data-expanded={expanded}
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden overflow-hidden border-r border-border/70 bg-card/95 shadow-xl shadow-black/20 transition-[width] duration-200 motion-reduce:transition-none md:flex md:flex-col",
          expanded ? "w-56" : "w-16",
        )}
      >
        <div
          data-testid="member-navigation-rail-header"
          className="flex h-16 min-h-16 items-center border-b border-border/70 px-3"
        >
          <button
            type="button"
            data-testid="admin-rail-opener"
            aria-expanded={expanded}
            aria-controls="admin-rail-navigation"
            aria-label={expanded ? "Collapse navigation" : "Expand navigation"}
            onClick={() => setExpanded((open) => !open)}
            className="flex h-10 min-w-10 items-center justify-center rounded-md border border-primary/25 bg-primary/15 text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <PanelLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <span
            className={cn(
              "ml-3 text-sm font-semibold",
              expanded ? "whitespace-nowrap" : "sr-only",
            )}
          >
            Member navigation
          </span>
        </div>

        <nav
          id="admin-rail-navigation"
          className="flex min-h-0 flex-1 flex-col p-2"
          aria-label="Primary"
        >
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden">
            {memberNavigationItems.map(renderItem)}
            {getAdminNavigationGroups(access).map((group) => (
              <div
                key={group.label}
                role="group"
                aria-label={group.label}
                className="space-y-2 border-t border-border/70 pt-2"
              >
                <p
                  className={cn(
                    "px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                    expanded ? "whitespace-nowrap" : "sr-only",
                  )}
                >
                  {group.label}
                </p>
                {group.items.map(renderItem)}
              </div>
            ))}
          </div>
        </nav>
      </aside>
    </TooltipProvider>
  );
}
