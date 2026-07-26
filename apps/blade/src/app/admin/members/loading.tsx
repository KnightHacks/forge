import { Skeleton } from "@forge/ui/skeleton";

import {
  AdminPageHeaderSkeleton,
  adminPageLayoutClassName,
} from "~/app/_components/admin/admin-page";

export default function AdminMembersLoading() {
  return (
    <main className={adminPageLayoutClassName}>
      <AdminPageHeaderSkeleton actions={2} />
      <div className="rounded-lg border border-white/10 bg-card/95 shadow-2xl shadow-black/25">
        <div className="flex gap-3 border-b border-border/70 p-5">
          <Skeleton className="h-11 flex-1" />
          <Skeleton className="h-11 w-28" />
          <Skeleton className="h-11 w-28" />
        </div>
        <div className="space-y-2 p-5">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      </div>
    </main>
  );
}
