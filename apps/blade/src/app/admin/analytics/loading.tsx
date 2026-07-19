import { Skeleton } from "@forge/ui/skeleton";

export default function AdminAnalyticsLoading() {
  return (
    <main className="container min-w-0 space-y-5 pb-16 pt-5 sm:pt-8">
      <div className="space-y-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-11 w-64 max-w-full" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </div>
      <Skeleton className="h-28 w-full rounded-lg" />
      <Skeleton className="h-12 w-full max-w-xl rounded-lg" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton className="h-32 rounded-lg" key={index} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Skeleton className="h-96 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    </main>
  );
}
