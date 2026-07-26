import { Skeleton } from "@forge/ui/skeleton";

import {
  AdminPageHeaderSkeleton,
  adminPageLayoutClassName,
} from "~/app/_components/admin/admin-page";

export default function AdminCheckInLoading() {
  return (
    <main className={adminPageLayoutClassName}>
      <AdminPageHeaderSkeleton titleWidth="w-72" />
      <Skeleton className="h-[32rem] w-full rounded-lg" />
    </main>
  );
}
