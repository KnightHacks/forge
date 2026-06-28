import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { LayoutDashboard, PanelLeft, UsersRound } from "lucide-react";

import { cn } from "@forge/ui";

import type { Session } from "~/server/auth";
import { SignOutButton } from "~/app/_components/auth/sign-out-button";
import { MemberRouteTransitionSurface } from "~/app/_components/member/member-route-transition-link";
import { MobileAdminNavigation } from "~/app/_components/member/mobile-admin-navigation";

type NavigationItem = "dashboard" | "members";

const navItems = [
  {
    href: "/member/dashboard",
    icon: LayoutDashboard,
    id: "dashboard",
    label: "Dashboard",
  },
  {
    href: "/admin/members",
    icon: UsersRound,
    id: "members",
    label: "Members",
  },
] as const;

export function AuthenticatedShell({
  activeNavigation = "dashboard",
  canAccessAdmin = false,
  children,
  session,
  sectionLabel,
}: {
  activeNavigation?: NavigationItem;
  canAccessAdmin?: boolean;
  children: ReactNode;
  session: Session;
  sectionLabel?: string;
}) {
  const currentSection =
    sectionLabel ??
    (activeNavigation === "members" ? "Member admin" : "Member dashboard");

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f22_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f22_1px,transparent_1px)] bg-[size:14px_24px]" />

      {canAccessAdmin && (
        <aside
          data-testid="admin-navigation-rail"
          className="group fixed inset-y-0 left-0 z-40 hidden w-16 overflow-hidden border-r border-border/70 bg-card/95 shadow-xl shadow-black/20 transition-[width] duration-200 focus-within:w-56 hover:w-56 motion-reduce:transition-none md:flex md:flex-col"
        >
          <div
            data-testid="admin-navigation-rail-header"
            className="flex h-16 min-h-16 items-center border-b border-border/70 px-3"
          >
            <div className="flex h-10 min-w-10 items-center justify-center rounded-md border border-primary/25 bg-primary/15 text-primary">
              <PanelLeft className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="ml-3 whitespace-nowrap text-sm font-semibold opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none">
              Blade navigation
            </span>
          </div>

          <nav className="flex flex-1 flex-col gap-2 p-2" aria-label="Primary">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeNavigation === item.id;
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
        </aside>
      )}

      <div
        className={cn("relative min-h-screen", canAccessAdmin && "md:pl-16")}
      >
        <header
          data-testid="blade-shell-header"
          className="sticky top-0 z-30 bg-card/95 shadow-lg shadow-black/10 backdrop-blur"
        >
          <div className="flex h-16 items-center justify-between gap-4 border-b border-border/70 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Image
                src="/white-kh-title-logo.svg"
                alt="Knight Hacks"
                width={2040}
                height={551}
                priority
                className="h-auto w-24 sm:w-[148px]"
              />
              <div className="hidden h-8 w-px bg-border sm:block" />
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-medium">{currentSection}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {session.user.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 [&>button]:h-11">
              {canAccessAdmin && (
                <MobileAdminNavigation activeNavigation={activeNavigation} />
              )}
              <SignOutButton />
            </div>
          </div>
        </header>

        <div className="relative z-10">
          <MemberRouteTransitionSurface>
            {children}
          </MemberRouteTransitionSurface>
        </div>
      </div>
    </div>
  );
}
