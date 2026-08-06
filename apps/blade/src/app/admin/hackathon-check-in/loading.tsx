import { Skeleton } from "@forge/ui/skeleton";

import {
  AdminPageHeaderSkeleton,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";

export default function HackathonCheckInLoading() {
  return (
    <main className={adminPageLayoutClassName}>
      <AdminPageHeaderSkeleton actions={1} titleWidth="w-80" />
      <section
        aria-label="Loading hackathon check-in"
        className="grid gap-4 rounded-lg border border-white/10 bg-card/95 p-3 shadow-2xl shadow-black/25 sm:p-6"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton className="h-11 w-full" key={index} />
          ))}
        </div>
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-64 w-full rounded-md" />
      </section>
    </main>
  );
}
