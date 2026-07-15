import { Skeleton } from "@forge/ui/skeleton";

export default function MemberFormsLoading() {
  return (
    <main
      className="container space-y-4 py-8"
      aria-label="Loading previous forms"
    >
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-lg" />
    </main>
  );
}
