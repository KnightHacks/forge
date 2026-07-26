import { Skeleton } from "@forge/ui/skeleton";

import { adminPageLayoutClassName } from "~/app/_components/admin/admin-page";

export default function IssueDetailLoading() {
  return (
    <main className={adminPageLayoutClassName}>
      <Skeleton className="h-11 w-36" />
      <header className="rounded-lg border border-white/10 bg-card/95 p-4 shadow-xl shadow-black/10 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-3">
            <Skeleton className="h-5 w-28" />
            <div className="flex gap-2">
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-7 w-20" />
            </div>
            <Skeleton className="h-10 w-96 max-w-full sm:h-12" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-11 w-28" />
            <Skeleton className="h-11 w-28" />
          </div>
        </div>
      </header>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(19rem,0.75fr)]">
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-80 w-full rounded-lg" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton className="h-32 w-full rounded-lg" key={index} />
          ))}
        </div>
      </div>
    </main>
  );
}
