import { Skeleton } from "@forge/ui/skeleton";

import {
  AdminPageHeaderSkeleton,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";

export default function AlumniAdminLoading() {
  return (
    <main className={adminPageLayoutClassName}>
      <AdminPageHeaderSkeleton actions={2} />
      <div className="overflow-hidden rounded-lg border border-white/10 bg-card/95 shadow-2xl shadow-black/20">
        <div className="flex justify-between gap-3 border-b border-border/70 p-4">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="space-y-3 p-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton className="h-20 w-full" key={index} />
          ))}
        </div>
      </div>
      <Skeleton className="h-80 w-full rounded-lg" />
    </main>
  );
}
