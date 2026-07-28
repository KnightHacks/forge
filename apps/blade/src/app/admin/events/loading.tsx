import { Skeleton } from "@forge/ui/skeleton";

import {
  AdminPageHeaderSkeleton,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";

export default function AdminEventsLoading() {
  return (
    <main className={adminPageLayoutClassName}>
      <AdminPageHeaderSkeleton actions={2} />
      <Skeleton className="h-12 w-full rounded-lg" />
      <section className="flex flex-col gap-3 rounded-lg border border-white/10 bg-card/95 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-11 w-28" />
          <Skeleton className="h-11 w-28" />
        </div>
      </section>
      <section className="rounded-lg border border-white/10 bg-card/95 shadow-2xl shadow-black/25">
        <div className="grid gap-3 border-b border-border/70 p-4 lg:grid-cols-[1fr_auto_auto]">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-28" />
          <Skeleton className="h-11 w-24" />
        </div>
        <div className="grid gap-2 p-3 sm:p-5">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-md" />
          ))}
        </div>
      </section>
    </main>
  );
}
