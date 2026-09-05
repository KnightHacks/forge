import { Skeleton } from "@forge/ui/skeleton";

import {
  AdminPageHeaderSkeleton,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";

export function ProjectWorkspaceSkeleton({
  admin = false,
  judge = false,
  variant = "projects",
}: {
  admin?: boolean;
  judge?: boolean;
  variant?: "deliberation" | "projects" | "submissions";
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
      {judge ? (
        <div className="grid h-11 w-full grid-cols-3 gap-1 rounded-md bg-muted p-1 sm:w-[28rem]">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton className="h-9 w-full" key={index} />
          ))}
        </div>
      ) : null}
      {variant === "projects" ? (
        <>
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
          <section className="hidden overflow-hidden rounded-lg border border-white/10 bg-card/95 md:block">
            <Skeleton className="h-12 w-full rounded-none" />
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                className={
                  judge
                    ? "grid grid-cols-[2fr_1fr_2fr_6rem_6rem_5rem] gap-6 border-t border-border/60 p-4"
                    : "grid grid-cols-[2fr_1fr_2fr_5rem] gap-6 border-t border-border/60 p-4"
                }
                key={index}
              >
                {Array.from({ length: judge ? 6 : 4 }).map((__, cell) => (
                  <Skeleton className="h-8 w-full" key={cell} />
                ))}
              </div>
            ))}
          </section>
          <section className="divide-y divide-border/60 overflow-hidden rounded-lg border border-white/10 bg-card/95 md:hidden">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="space-y-4 p-4" key={index}>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-11 flex-1" />
                  <Skeleton className="h-11 flex-1" />
                </div>
              </div>
            ))}
          </section>
          <Skeleton className="h-14 w-full" />
        </>
      ) : null}
      {variant === "submissions" ? (
        <section className="overflow-hidden rounded-lg border border-white/10 bg-card/95">
          <div className="hidden md:block">
            <Skeleton className="h-12 w-full rounded-none" />
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                className="grid grid-cols-[2fr_1fr_1fr_7rem_7rem] gap-6 border-t border-border/60 p-4"
                key={index}
              >
                {Array.from({ length: 5 }).map((__, cell) => (
                  <Skeleton className="h-8 w-full" key={cell} />
                ))}
              </div>
            ))}
          </div>
          <div className="divide-y divide-border/60 md:hidden">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="space-y-4 p-4" key={index}>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-11 flex-1" />
                  <Skeleton className="h-11 flex-1" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {variant === "deliberation" ? (
        <>
          <section className="grid gap-4 rounded-lg border border-white/10 bg-card/90 p-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-4 w-full max-w-xl" />
            </div>
            <Skeleton className="h-11 w-full sm:w-40" />
          </section>
          {Array.from({ length: 2 }).map((_, index) => (
            <section
              className="space-y-4 rounded-lg border border-white/10 bg-card/95 p-4"
              key={index}
            >
              <div className="flex flex-wrap gap-2">
                <Skeleton className="size-11" />
                <Skeleton className="h-11 min-w-40 flex-1" />
                <Skeleton className="h-11 w-24" />
              </div>
              {Array.from({ length: 3 }).map((__, entry) => (
                <Skeleton className="h-16 w-full" key={entry} />
              ))}
            </section>
          ))}
        </>
      ) : null}
    </main>
  );
}
