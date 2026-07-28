import { Skeleton } from "@forge/ui/skeleton";

import {
  AdminPageHeaderSkeleton,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";

export default function AdminFormsLoading() {
  return (
    <main className={adminPageLayoutClassName} aria-label="Loading forms">
      <AdminPageHeaderSkeleton actions={2} />
      <Skeleton className="h-12 w-full rounded-lg" />
      <div className="rounded-lg border border-white/10 bg-card/95 p-4 shadow-xl shadow-black/15">
        <Skeleton className="h-11 w-full" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton className="h-16 w-full rounded-md" key={index} />
          ))}
        </div>
      </div>
    </main>
  );
}
