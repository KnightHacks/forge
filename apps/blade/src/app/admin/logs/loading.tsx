import { Skeleton } from "@forge/ui/skeleton";

export default function AdminLogsLoading() {
  return (
    <main className="mx-auto w-full max-w-[96rem] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="h-5 w-[36rem] max-w-full" />
      </div>
      <Skeleton className="h-72 w-full rounded-lg" />
      <Skeleton className="h-96 w-full rounded-lg" />
    </main>
  );
}
