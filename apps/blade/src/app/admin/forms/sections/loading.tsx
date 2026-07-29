import { Skeleton } from "@forge/ui/skeleton";

import {
  AdminPageHeaderSkeleton,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";

export default function FormSectionsLoading() {
  return (
    <main className={adminPageLayoutClassName}>
      <Skeleton className="h-11 w-28" />
      <AdminPageHeaderSkeleton actions={1} titleWidth="w-72" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton className="h-36 w-full rounded-lg" key={index} />
        ))}
      </div>
    </main>
  );
}
