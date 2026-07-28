import { Skeleton } from "@forge/ui/skeleton";

import {
  AdminPageHeaderSkeleton,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";

export default function FormResponsesLoading() {
  return (
    <main className={adminPageLayoutClassName}>
      <Skeleton className="h-11 w-36" />
      <AdminPageHeaderSkeleton actions={1} titleWidth="w-80" />
      <Skeleton className="h-12 w-full max-w-md" />
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton className="h-28 w-full rounded-lg" key={index} />
        ))}
      </div>
      <Skeleton className="h-96 w-full rounded-lg" />
    </main>
  );
}
