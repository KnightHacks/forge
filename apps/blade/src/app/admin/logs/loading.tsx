import { Skeleton } from "@forge/ui/skeleton";

import {
  AdminPageHeaderSkeleton,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";

export default function AdminLogsLoading() {
  return (
    <main className={adminPageLayoutClassName}>
      <AdminPageHeaderSkeleton titleWidth="w-80" />
      <div className="rounded-lg border border-white/10 bg-card/95 p-4 sm:p-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-4 h-11 w-full" />
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div className="space-y-2" key={index}>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-white/10 bg-card/95">
        <Skeleton className="h-12 w-full rounded-none" />
        <div className="space-y-2 p-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton className="h-14 w-full" key={index} />
          ))}
        </div>
      </div>
    </main>
  );
}
