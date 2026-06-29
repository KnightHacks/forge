import { Skeleton } from "@forge/ui/skeleton";

export default function AdminRolesLoading() {
  return (
    <main className="container min-w-0 space-y-5 pb-16 pt-6 md:pt-10">
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-11 w-64 max-w-full" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </div>
      <Skeleton className="h-11 w-64 max-w-full" />
      <div className="overflow-hidden rounded-lg border border-white/10 bg-card/95 shadow-2xl shadow-black/25">
        <div className="space-y-4 border-b border-border/70 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
            <Skeleton className="h-11 w-28" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-11 flex-1" />
            <Skeleton className="h-11 w-24" />
            <Skeleton className="h-11 w-24" />
          </div>
        </div>
        <div className="space-y-2 p-3 sm:p-5">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      </div>
    </main>
  );
}
