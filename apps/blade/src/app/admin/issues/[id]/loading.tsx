import { Skeleton } from "@forge/ui/skeleton";

import {
  AdminPageHeaderSkeleton,
  adminPageLayoutClassName,
} from "~/app/_components/admin/admin-page";

export default function IssueDetailLoading() {
  return (
    <main className={adminPageLayoutClassName}>
      <Skeleton className="h-11 w-36" />
      <AdminPageHeaderSkeleton actions={2} titleWidth="w-96" />
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
