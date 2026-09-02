import type { ReactNode } from "react";
import Image from "next/image";

import { Skeleton } from "@forge/ui/skeleton";

/**
 * Keeps Blade's authenticated chrome stable while a route that owns its shell
 * is still resolving auth and server data. Routes nested under a shell-owning
 * layout do not need this wrapper.
 */
export function AuthenticatedShellSkeleton({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      aria-busy="true"
      aria-label="Blade workspace loading"
      className="relative min-h-screen overflow-x-hidden bg-background"
      data-testid="authenticated-shell-skeleton"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f22_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f22_1px,transparent_1px)] bg-[size:14px_24px]"
      />

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-16 border-r border-border/70 bg-card/95 shadow-xl shadow-black/20 md:flex md:flex-col">
        <div className="flex h-16 min-h-16 items-center justify-center border-b border-border/70">
          <Skeleton className="size-10" />
        </div>
        <div className="grid gap-2 p-2">
          {[2, 3, 3].map((count, groupIndex) => (
            <div
              className="grid gap-2 border-t border-border/70 pt-2 first:border-t-0 first:pt-0"
              key={groupIndex}
            >
              {Array.from({ length: count }, (_, index) => (
                <Skeleton className="h-11 w-full" key={index} />
              ))}
            </div>
          ))}
        </div>
      </aside>

      <div className="relative min-h-screen md:pl-16">
        <header className="sticky top-0 z-30 bg-card/95 shadow-lg shadow-black/10 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-4 border-b border-border/70 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Image
                src="/blade-logo.svg"
                alt="Blade by Knight Hacks"
                width={1880}
                height={375}
                priority
                className="h-auto w-32 sm:w-44"
              />
              <div className="hidden h-8 w-px bg-border sm:block" />
              <div className="hidden gap-2 sm:grid">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
            <Skeleton className="size-11" />
          </div>
        </header>

        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}
