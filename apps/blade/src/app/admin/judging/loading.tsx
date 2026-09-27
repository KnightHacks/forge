import { Skeleton } from "@forge/ui/skeleton";

import {
  AdminPageHeaderSkeleton,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";

export default function JudgingAdminLoading() {
  return (
    <main className={adminPageLayoutClassName} aria-busy="true">
      <AdminPageHeaderSkeleton actions={1} titleWidth="w-60" />
      <div className="grid h-11 w-full grid-cols-4 gap-1 rounded-md bg-muted p-1 sm:w-[34rem]">
        {[0, 1, 2, 3].map((tab) => (
          <Skeleton className="h-9 w-full" key={tab} />
        ))}
      </div>
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </section>
      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between gap-4 border-b border-border p-5">
          <div className="space-y-2">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        {[0, 1, 2, 3].map((row) => (
          <div
            className="grid gap-3 border-b border-border p-5 last:border-b-0 lg:grid-cols-[auto_minmax(0,1fr)_14rem_auto]"
            key={row}
          >
            <Skeleton className="h-11 w-20" />
            <div className="space-y-3">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="size-10" />
          </div>
        ))}
      </section>
    </main>
  );
}
