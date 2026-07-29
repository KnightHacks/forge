import { Skeleton } from "@forge/ui/skeleton";

import {
  AdminPageHeaderSkeleton,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";

export default function CreateFormLoading() {
  return (
    <main className={adminPageLayoutClassName}>
      <Skeleton className="h-11 w-28" />
      <AdminPageHeaderSkeleton actions={2} titleWidth="w-64" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton className="h-7 w-32" key={index} />
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton className="h-44 w-full rounded-lg" key={index} />
        ))}
      </div>
    </main>
  );
}
