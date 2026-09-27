import type { LucideIcon } from "lucide-react";

import { cn } from "@forge/ui";

import { RouteTransitionLink as Link } from "~/app/_components/shared/route-transition-link";

export interface EventWorkspaceSection<T extends string> {
  href: string;
  icon: LucideIcon;
  label: string;
  value: T;
}

export function EventWorkspaceSections<T extends string>({
  current,
  label = "Event management sections",
  sections,
}: {
  current: T;
  label?: string;
  sections: EventWorkspaceSection<T>[];
}) {
  return (
    <nav
      aria-label={label}
      className="flex min-w-0 gap-1 overflow-x-auto rounded-lg border border-white/10 bg-card/95 p-1 shadow-lg shadow-black/15"
    >
      {sections.map((section) => {
        const Icon = section.icon;
        const active = section.value === current;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-primary/15 text-foreground"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
            )}
            href={section.href}
            key={section.value}
          >
            <Icon className="size-4" aria-hidden="true" />
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
