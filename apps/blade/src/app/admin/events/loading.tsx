import { Skeleton } from "@forge/ui/skeleton";

export default function AdminEventsLoading() {
  return (
    <main className="container min-w-0 space-y-6 pb-16 pt-5 sm:pt-8">
      <div className="space-y-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-11 w-72 max-w-full" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>
      <Skeleton className="h-12 w-full max-w-md rounded-lg" />
      <section className="rounded-lg border border-white/10 bg-card/95 shadow-2xl shadow-black/25">
        <div className="grid gap-3 border-b border-border/70 p-4 lg:grid-cols-[1fr_auto_auto]">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-28" />
          <Skeleton className="h-11 w-24" />
        </div>
        <div className="grid gap-2 p-3 sm:p-5">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-md" />
          ))}
        </div>
      </section>
    </main>
  );
}
