import { Card, CardContent, CardHeader } from "@forge/ui/card";
import { Skeleton } from "@forge/ui/skeleton";

import {
  AdminPageHeaderSkeleton,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";

export function HackerRosterSkeleton() {
  return (
    <main
      aria-label="Hacker roster loading"
      aria-busy="true"
      data-loading-surface="hacker-roster"
      className={adminPageLayoutClassName}
    >
      <AdminPageHeaderSkeleton titleWidth="w-48" />

      <Card className="w-full min-w-0 gap-0 overflow-hidden border-white/10 bg-card/95 py-0 shadow-2xl shadow-black/25">
        <CardHeader className="min-w-0 gap-3 border-b border-border/70 px-3 py-3 sm:px-4 sm:py-4 md:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Skeleton className="h-11 min-w-0 flex-1 rounded-md" />
            <Skeleton className="h-11 w-full rounded-md lg:w-32" />
            <Skeleton className="h-11 w-full rounded-md lg:w-44" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton className="h-9 w-24 rounded-md" key={index} />
              ))}
            </div>
            <Skeleton className="h-11 w-24 rounded-md" />
          </div>
        </CardHeader>

        <CardContent className="px-0 py-0">
          <div className="overflow-hidden">
            <div className="grid grid-cols-[3rem_minmax(0,1fr)_7rem] gap-3 border-b border-border/70 px-4 py-3 md:grid-cols-[3rem_minmax(0,1fr)_10rem_8rem] md:px-6">
              <Skeleton className="size-5 rounded" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="hidden h-4 w-16 md:block" />
              <Skeleton className="h-4 w-16" />
            </div>
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                className="grid min-h-16 grid-cols-[3rem_minmax(0,1fr)_7rem] items-center gap-3 border-b border-border/60 px-4 py-3 last:border-b-0 md:grid-cols-[3rem_minmax(0,1fr)_10rem_8rem] md:px-6"
                key={index}
              >
                <Skeleton className="size-5 rounded" />
                <div className="min-w-0 space-y-2">
                  <Skeleton className="h-4 w-40 max-w-full" />
                  <Skeleton className="h-3 w-56 max-w-full" />
                </div>
                <Skeleton className="hidden h-4 w-28 md:block" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
        <div className="border-t border-border/70 px-3 py-3 sm:px-4 md:px-6">
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      </Card>
    </main>
  );
}
