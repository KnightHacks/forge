import { Skeleton } from "@forge/ui/skeleton";

import {
  AdminPageHeaderSkeleton,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";

export function ProjectWorkspaceSkeleton({
  admin = false,
}: {
  admin?: boolean;
}) {
  return (
    <main
      aria-label="Loading projects"
      aria-busy="true"
      className={adminPageLayoutClassName}
    >
      <AdminPageHeaderSkeleton actions={1} titleWidth="w-72" />
      {admin ? (
        <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-card/80 p-4 sm:flex-row sm:justify-between">
          <Skeleton className="h-16 w-full sm:w-72" />
          <Skeleton className="h-16 w-full sm:w-44" />
        </div>
      ) : (
        <Skeleton className="h-6 w-48" />
      )}
      <section className="space-y-3 rounded-lg border border-white/10 bg-card/90 p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_16rem_9rem_9rem_6rem]">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton className="h-11 w-full" key={index} />
          ))}
        </div>
        <div className="flex gap-3 border-t border-border/60 pt-3">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-36" />
        </div>
      </section>
      <section className="overflow-hidden rounded-lg border border-white/10 bg-card/95">
        <Skeleton className="h-12 w-full rounded-none" />
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            className="grid grid-cols-[2fr_1fr_2fr_5rem] gap-6 border-t border-border/60 p-4"
            key={index}
          >
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </section>
      <Skeleton className="h-14 w-full" />
    </main>
  );
}
