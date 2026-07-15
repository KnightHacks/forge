import { Skeleton } from "@forge/ui/skeleton";

export default function AdminFormsLoading() {
  return (
    <main className="container space-y-5 py-8" aria-label="Loading forms">
      <Skeleton className="h-10 w-72 max-w-full" />
      <Skeleton className="h-12 w-full rounded-lg" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </main>
  );
}
