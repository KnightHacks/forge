import { Skeleton } from "@forge/ui/skeleton";

import {
  AdminPageHeaderSkeleton,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";

export default function AdminCheckInLoading() {
  return (
    <main className={adminPageLayoutClassName}>
      <AdminPageHeaderSkeleton titleWidth="w-72" />
      <section
        data-testid="event-check-in-loading"
        aria-label="Loading event check-in"
        className="grid min-w-0 gap-0 sm:gap-4"
      >
        <div className="border-y border-white/10 bg-card/95 p-3 shadow-2xl shadow-black/25 sm:rounded-lg sm:border sm:p-6">
          <div className="grid gap-3 border-b border-border/60 pb-4">
            <div className="grid grid-cols-2 rounded-lg border border-white/10 bg-background/60 p-1">
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  className="flex min-h-11 items-center justify-center gap-2 rounded-md px-3"
                  key={index}
                >
                  <Skeleton className="size-4 shrink-0 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>

            <div className="grid gap-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-11 w-full bg-primary/10" />
            </div>
          </div>

          <div className="mt-4 w-full">
            <div className="grid min-h-11 grid-cols-2 rounded-lg bg-muted p-1">
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  className="flex items-center justify-center gap-2 rounded-md px-3"
                  key={index}
                >
                  <Skeleton className="size-4 shrink-0 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-4">
              <div className="flex min-h-11 items-center justify-between gap-4 rounded-md border border-white/10 bg-background/60 px-3 py-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>
              <Skeleton className="h-11 w-full" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
