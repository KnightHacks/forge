import { Skeleton } from "@forge/ui/skeleton";

import {
  AdminPageHeaderSkeleton,
  adminPageLayoutClassName,
} from "~/app/_components/admin/admin-page";

export default function AdminCompaniesLoading() {
  return (
    <main className={adminPageLayoutClassName}>
      <AdminPageHeaderSkeleton actions={3} titleWidth="w-64" />
      <section className="overflow-hidden rounded-lg border border-white/10 bg-card/95 shadow-2xl shadow-black/25">
        <div className="space-y-3 border-b border-border/70 p-4 sm:p-6">
          <Skeleton className="h-11 w-full max-w-2xl" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton className="h-9 w-28" key={index} />
            ))}
          </div>
        </div>
        <div className="space-y-2 p-4 sm:p-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton className="h-16 w-full" key={index} />
          ))}
        </div>
      </section>
    </main>
  );
}
