import { Skeleton } from "@forge/ui/skeleton";

export default function AdminCheckInLoading() {
  return (
    <main className="container min-w-0 space-y-6 pb-16 pt-5 sm:pt-8">
      <div className="space-y-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-11 w-72 max-w-full" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-[32rem] w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </section>
    </main>
  );
}
