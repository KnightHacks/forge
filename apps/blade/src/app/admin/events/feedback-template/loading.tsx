import { Skeleton } from "@forge/ui/skeleton";

import {
  AdminPageHeaderSkeleton,
  adminPageLayoutClassName,
} from "~/app/_components/admin/admin-page";

export default function EventFeedbackTemplateLoading() {
  return (
    <main className={adminPageLayoutClassName}>
      <Skeleton className="h-11 w-28" />
      <AdminPageHeaderSkeleton actions={1} titleWidth="w-96" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton className="h-40 w-full rounded-lg" key={index} />
        ))}
      </div>
    </main>
  );
}
