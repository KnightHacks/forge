import { Skeleton } from "@forge/ui/skeleton";

import {
  AdminPageHeaderSkeleton,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";

/**
 * One panel's worth of skeleton: a heading block and the same
 * table-versus-cards split the real section renders, so the visual harness's
 * `.animate-pulse` guard is comparing like with like.
 */
function PanelSkeleton({ rows }: { rows: number }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-card/95">
      <div className="space-y-2 border-b border-border/70 p-4 sm:p-6">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="hidden md:block">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            className="flex min-h-11 items-center gap-4 border-b border-border/40 px-4 py-3"
            key={index}
          >
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="ml-auto h-11 w-24" />
          </div>
        ))}
      </div>
      <div className="grid min-w-0 gap-2 p-2 sm:p-3 md:hidden">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton className="h-28 w-full rounded-md" key={index} />
        ))}
      </div>
    </div>
  );
}

export default function AdminRolesConfigLoading() {
  return (
    <main className={adminPageLayoutClassName}>
      <Skeleton className="h-11 w-28" />
      <AdminPageHeaderSkeleton titleWidth="w-80" />
      {/*
        Four direct children, matching the console: `adminPageLayoutClassName`
        ends in `space-y-*`, which is `> * + *`, so an extra wrapper here would
        make the skeleton and the real page space differently.
      */}
      <section
        aria-label="Loading Discord configuration"
        className="min-w-0"
        data-testid="admin-roles-config-loading"
      >
        <PanelSkeleton rows={5} />
      </section>
      <section
        aria-label="Loading club roster classification"
        className="min-w-0 space-y-4"
      >
        <PanelSkeleton rows={3} />
        <PanelSkeleton rows={4} />
      </section>
    </main>
  );
}
