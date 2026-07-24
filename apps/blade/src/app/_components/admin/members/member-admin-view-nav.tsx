import Link from "next/link";
import { Building2, UsersRound } from "lucide-react";

import { cn } from "@forge/ui";

export function MemberAdminViewNav({
  active,
}: {
  active: "companies" | "people";
}) {
  const items = [
    {
      href: "/admin/members",
      icon: UsersRound,
      id: "people" as const,
      label: "People",
    },
    {
      href: "/admin/members/companies",
      icon: Building2,
      id: "companies" as const,
      label: "Companies",
    },
  ];

  return (
    <nav
      aria-label="Member administration views"
      className="flex w-fit rounded-lg border border-white/10 bg-card/80 p-1"
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active === item.id ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active === item.id
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
