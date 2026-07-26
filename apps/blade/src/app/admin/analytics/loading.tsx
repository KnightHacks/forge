import { Skeleton } from "@forge/ui/skeleton";

import {
  AdminPageHeaderSkeleton,
  adminPageLayoutClassName,
} from "~/app/_components/admin/admin-page";

export default function AdminAnalyticsLoading() {
  return (
    <main className={adminPageLayoutClassName}>
      <AdminPageHeaderSkeleton actions={3} titleWidth="w-64" />
      <div className="grid gap-3 rounded-lg border border-white/10 bg-card/95 p-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton className="h-11 w-full" key={index} />
        ))}
      </div>
      <Skeleton className="h-12 w-full rounded-lg" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, index) => (
          <Skeleton className="h-32 rounded-lg" key={index} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Skeleton className="h-96 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    </main>
  );
}
