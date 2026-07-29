import { Skeleton } from "@forge/ui/skeleton";

import {
  adminPageClassName,
  AdminPageHeaderSkeleton,
  adminPageStackClassName,
} from "~/app/_components/shared/admin-page";

type IssueLoadingView = "archive" | "calendar" | "kanban" | "list";

function WorkspaceDockSkeleton({ view }: { view: IssueLoadingView }) {
  return (
    <section
      className="overflow-hidden rounded-lg border border-white/10 bg-card/95 shadow-xl shadow-black/10"
      data-issue-dock
    >
      <div className="flex min-w-0 flex-col gap-2 bg-background/25 p-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton
              className={
                index === ["calendar", "kanban", "list"].indexOf(view)
                  ? "h-11 bg-primary/20"
                  : "h-11"
              }
              key={index}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-11 w-24" />
          <Skeleton className="hidden h-11 w-28 sm:block" />
          <Skeleton className="hidden h-11 w-24 sm:block" />
          <Skeleton className="h-11 w-24" />
        </div>
      </div>

      <div className="flex min-h-[3.75rem] items-center justify-between gap-3 border-t border-white/10 bg-card/30 px-3 py-2">
        <Skeleton className="h-5 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="hidden h-9 w-24 sm:block" />
        </div>
      </div>
    </section>
  );
}

function CalendarSkeleton() {
  return (
    <>
      <section className="hidden h-[calc(100svh-23.5rem)] min-h-[23rem] flex-col overflow-hidden rounded-lg border border-white/10 bg-card/95 md:flex">
        <div className="grid grid-cols-7 gap-px border-b border-white/10 bg-background/55 px-2 py-2">
          {Array.from({ length: 7 }, (_, index) => (
            <Skeleton className="h-3 w-9" key={index} />
          ))}
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6">
          {Array.from({ length: 42 }, (_, index) => (
            <div
              className="min-h-0 border-b border-r border-white/10 p-2"
              key={index}
            >
              <Skeleton className="h-4 w-5" />
              {index % 4 === 0 ? (
                <Skeleton className="mt-3 h-10 w-full" />
              ) : null}
            </div>
          ))}
        </div>
      </section>
      <section className="grid gap-3 md:hidden">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            className="overflow-hidden rounded-lg border border-white/10 bg-card/95"
            key={index}
          >
            <div className="border-b border-white/10 bg-background/55 px-3 py-3">
              <Skeleton className="h-4 w-44" />
            </div>
            <div className="p-2">
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        ))}
      </section>
    </>
  );
}

function KanbanSkeleton() {
  return (
    <section className="min-w-0 overflow-hidden">
      <div className="grid min-w-[64rem] grid-cols-4 gap-3 overflow-x-auto pb-3 lg:min-w-0">
        {Array.from({ length: 4 }, (_, column) => (
          <div
            className="overflow-hidden rounded-lg border border-white/10 bg-card/95"
            key={column}
          >
            <div className="flex items-center justify-between border-b border-white/10 bg-background/55 px-3 py-3">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-5" />
            </div>
            <div className="grid gap-2 p-2">
              {Array.from({ length: column === 2 ? 2 : 3 }, (_, card) => (
                <Skeleton className="h-28 w-full" key={card} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ListSkeleton() {
  return (
    <section className="overflow-hidden rounded-lg border border-white/10 bg-card/95">
      <div className="hidden grid-cols-[minmax(16rem,1.8fr)_minmax(10rem,1fr)_9rem_9rem_7rem] gap-3 border-b border-white/10 bg-background/55 px-4 py-3 md:grid">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton className="h-3 w-20" key={index} />
        ))}
      </div>
      <div className="divide-y divide-white/10">
        {Array.from({ length: 8 }, (_, row) => (
          <div
            className="grid min-h-16 gap-3 px-4 py-3 md:grid-cols-[minmax(16rem,1.8fr)_minmax(10rem,1fr)_9rem_9rem_7rem] md:items-center"
            key={row}
          >
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="hidden h-4 w-28 md:block" />
            <Skeleton className="hidden h-7 w-24 md:block" />
            <Skeleton className="hidden h-4 w-20 md:block" />
            <Skeleton className="hidden h-7 w-16 md:block" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function IssueWorkspaceSkeleton({ view }: { view: IssueLoadingView }) {
  return (
    <main
      className={adminPageClassName}
      data-issue-loading-view={view}
      aria-busy="true"
      aria-label={`Loading issue ${view}`}
      role="status"
    >
      <span className="sr-only">Loading issue {view}</span>
      <div className={adminPageStackClassName}>
        <AdminPageHeaderSkeleton
          actions={1}
          descriptionWidth="max-w-xl"
          titleWidth="w-40"
        />
        <WorkspaceDockSkeleton view={view} />
        {view === "calendar" ? (
          <CalendarSkeleton />
        ) : view === "kanban" ? (
          <KanbanSkeleton />
        ) : (
          <ListSkeleton />
        )}
      </div>
    </main>
  );
}
