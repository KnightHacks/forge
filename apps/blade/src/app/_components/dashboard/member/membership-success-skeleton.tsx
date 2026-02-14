import { Card, CardContent, CardHeader } from "@forge/ui/card";
import { Skeleton } from "@forge/ui/skeleton";

export function MembershipSuccessSkeleton() {
  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-3xl px-4">
        {/* Header Section Skeleton */}
        <div className="mb-8 text-center">
          <div className="mx-auto">
            <Skeleton className="mx-auto mb-4 h-16 w-16 rounded-full" />
          </div>
          <Skeleton className="mx-auto mb-2 h-9 w-64" />
          <Skeleton className="mx-auto h-5 w-96" />
        </div>

        {/* Order Alert Skeleton */}
        <div className="mb-8 rounded-lg border p-4">
          <Skeleton className="mb-2 h-6 w-36" />
          <Skeleton className="h-5 w-72" />
        </div>

        {/* Order Summary Card Skeleton */}
        <Card className="mb-8">
          <CardHeader>
            <Skeleton className="h-7 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons Skeleton */}
        <div className="flex flex-row justify-center gap-4">
          <Skeleton className="h-10 w-full sm:w-36" />
        </div>
      </div>
    </div>
  );
}
