import type { ReactNode } from "react";
import Image from "next/image";

import { cn } from "@forge/ui";

import type { AdminNavigationAccess } from "~/app/_components/shared/admin-navigation";
import type { Session } from "~/server/auth";
import { SignOutButton } from "~/app/_components/auth/sign-out-button";
import { AccountSettingsLink } from "~/app/_components/shared/account-settings-link";
import { getVisibleAdminNavigation } from "~/app/_components/shared/admin-navigation";
import { DesktopAdminNavigation } from "~/app/_components/shared/desktop-admin-navigation";
import { MobileAdminNavigation } from "~/app/_components/shared/mobile-admin-navigation";
import {
  RouteTransitionLink as Link,
  RouteTransitionSurface,
} from "~/app/_components/shared/route-transition-link";

type NavigationItem =
  | "alumni"
  | "analytics"
  | "companies"
  | "dashboard"
  | "email"
  | "eventCheckIn"
  | "events"
  | "forms"
  | "hackathonCheckIn"
  | "hackathonEvents"
  | "logs"
  | "members"
  | "roles"
  | "settings";

export function AuthenticatedShell({
  activeNavigation = "dashboard",
  adminNavigation,
  children,
  displayName,
  session,
  sectionLabel,
}: {
  activeNavigation?: NavigationItem;
  adminNavigation?: AdminNavigationAccess;
  children: ReactNode;
  displayName?: string;
  session: Session;
  sectionLabel?: string;
}) {
  const currentSection =
    sectionLabel ??
    (activeNavigation === "alumni"
      ? "Alumni admin"
      : activeNavigation === "analytics"
        ? "Club analytics"
        : activeNavigation === "companies"
          ? "Company admin"
          : activeNavigation === "email"
            ? "Email portal"
            : activeNavigation === "members"
              ? "Member admin"
              : activeNavigation === "eventCheckIn"
                ? "Event check-in"
                : activeNavigation === "events"
                  ? "Event admin"
                  : activeNavigation === "forms"
                    ? "Form admin"
                    : activeNavigation === "roles"
                      ? "Role admin"
                      : activeNavigation === "logs"
                        ? "Admin logs"
                        : activeNavigation === "settings"
                          ? "Member settings"
                          : "Member dashboard");

  // Ordinary members get no rail/drawer (R-02); presentation only, access is enforced server-side.
  const hasAdminDestinations =
    getVisibleAdminNavigation(adminNavigation ?? {}).length > 0;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f22_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f22_1px,transparent_1px)] bg-[size:14px_24px]" />

      {hasAdminDestinations ? (
        <DesktopAdminNavigation access={adminNavigation ?? {}} />
      ) : null}

      <div
        className={cn(
          "relative min-h-screen",
          hasAdminDestinations && "md:pl-16",
        )}
      >
        <header
          data-testid="blade-shell-header"
          className="sticky top-0 z-30 bg-card/95 shadow-lg shadow-black/10 backdrop-blur"
        >
          <div className="flex h-16 items-center justify-between gap-4 border-b border-border/70 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/"
                aria-label="Blade home"
                className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Image
                  src="/blade-logo.svg"
                  alt="Blade by Knight Hacks"
                  width={1880}
                  height={375}
                  priority
                  className="h-auto w-32 sm:w-44"
                />
              </Link>
              <div className="hidden h-8 w-px bg-border sm:block" />
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-medium">{currentSection}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {displayName ?? session.user.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 [&>button]:h-11">
              {hasAdminDestinations ? (
                <MobileAdminNavigation access={adminNavigation ?? {}} />
              ) : null}
              <AccountSettingsLink />
              <SignOutButton />
            </div>
          </div>
        </header>

        <div className="relative z-10">
          <RouteTransitionSurface>{children}</RouteTransitionSurface>
        </div>
      </div>
    </div>
  );
}
