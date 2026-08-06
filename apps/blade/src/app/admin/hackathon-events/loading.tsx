import { Skeleton } from "@forge/ui/skeleton";

import {
  AdminPageHeaderSkeleton,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";

export default function HackathonEventsLoading() {
  return (
    <main className={adminPageLayoutClassName}>
      <AdminPageHeaderSkeleton actions={1} titleWidth="w-72" />
      <Skeleton className="h-11 w-full max-w-sm" />
      <section className="grid gap-3 rounded-lg border border-white/10 bg-card/95 p-3 shadow-2xl shadow-black/25 sm:p-5">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton className="h-20 w-full rounded-md" key={index} />
        ))}
      </section>
    </main>
  );
}
