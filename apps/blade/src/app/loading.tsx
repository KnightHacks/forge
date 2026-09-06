import Image from "next/image";

import { Skeleton } from "@forge/ui/skeleton";

/** Covers the wait for layouts themselves; leaf routes keep their own skeletons. */
export default function BladeLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Blade loading"
      className="min-h-screen bg-background"
    >
      <header className="flex h-16 items-center justify-between border-b border-border/70 bg-card/95 px-4 sm:px-6 lg:px-8">
        <Image
          src="/blade-logo.svg"
          alt="Blade by Knight Hacks"
          width={1880}
          height={375}
          priority
          className="h-auto w-32 sm:w-44"
        />
        <Skeleton className="size-11" />
      </header>
      <main className="container space-y-6 pb-16 pt-5 sm:pt-8">
        <span role="status" className="sr-only">
          Loading workspace…
        </span>
        <div aria-hidden="true" className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-64 max-w-full" />
          <Skeleton className="h-5 w-full max-w-lg" />
        </div>
        <section
          aria-hidden="true"
          className="overflow-hidden rounded-lg border border-border bg-card"
        >
          <div className="flex justify-between gap-4 border-b border-border p-4 sm:p-6">
            <Skeleton className="h-10 w-56 max-w-full" />
            <Skeleton className="h-10 w-24" />
          </div>
          <div className="space-y-4 p-4 sm:p-6">
            {[0, 1, 2, 3, 4].map((row) => (
              <div
                key={row}
                className="flex items-center gap-4 rounded-md border border-border/60 bg-background/60 p-4"
              >
                <Skeleton className="size-10 shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-40 max-w-full" />
                  <Skeleton className="h-4 w-full max-w-sm" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
