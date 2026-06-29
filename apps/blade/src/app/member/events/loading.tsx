import { Skeleton } from "@forge/ui/skeleton";

export default function MemberEventsLoading() {
  return (
    <main className="container space-y-6 pb-16 pt-5 sm:pt-8">
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-11 w-48" />
        <Skeleton className="h-5 w-full max-w-lg" />
      </div>
      {[3, 2].map((count, section) => (
        <section
          key={section}
          className="rounded-lg border border-white/10 bg-card/95 p-4 shadow-xl shadow-black/20"
        >
          <Skeleton className="mb-4 h-7 w-48" />
          <div className="grid gap-3">
            {Array.from({ length: count }).map((_, index) => (
              <Skeleton key={index} className="h-32 w-full rounded-md" />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
