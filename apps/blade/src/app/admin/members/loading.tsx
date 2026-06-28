import { Skeleton } from "@forge/ui/skeleton";

export default function AdminMembersLoading() {
  return (
    <main className="container min-h-[calc(100svh-4rem)] space-y-6 pb-16 pt-6 md:pt-10">
      <div className="space-y-3">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>
      <div className="rounded-lg border border-white/10 bg-card/95 shadow-2xl shadow-black/25">
        <div className="flex gap-3 border-b border-border/70 p-5">
          <Skeleton className="h-11 flex-1" />
          <Skeleton className="h-11 w-28" />
          <Skeleton className="h-11 w-28" />
        </div>
        <div className="space-y-2 p-5">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      </div>
    </main>
  );
}
