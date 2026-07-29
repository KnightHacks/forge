import { Skeleton } from "@forge/ui/skeleton";

import { adminPageLayoutClassName } from "~/app/_components/shared/admin-page";

export default function AdminCompanyDetailLoading() {
  return (
    <main className={adminPageLayoutClassName}>
      <Skeleton className="h-11 w-36" />
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Skeleton className="size-20 shrink-0 rounded-lg" />
          <div className="min-w-0 space-y-2">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-10 w-72 max-w-full sm:h-12" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
        <Skeleton className="h-11 w-32" />
      </header>
      <Skeleton className="h-32 w-full rounded-lg" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 w-full rounded-lg" />
        <Skeleton className="h-80 w-full rounded-lg" />
      </div>
    </main>
  );
}
