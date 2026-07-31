import { Skeleton } from "@forge/ui/skeleton";

import {
  AdminPageHeaderSkeleton,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";

export default function AdminHackathonDetailLoading() {
  return (
    <main className={adminPageLayoutClassName}>
      <Skeleton className="h-11 w-32" />
      <AdminPageHeaderSkeleton actions={2} />
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-96 w-full rounded-lg" />
      <Skeleton className="h-72 w-full rounded-lg" />
    </main>
  );
}
