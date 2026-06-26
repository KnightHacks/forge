"use client";

import { cn } from "@forge/ui";
import { Card, CardContent } from "@forge/ui/card";
import { Skeleton } from "@forge/ui/skeleton";
import { MEMBER_SIGNUP_FORM_SLUG } from "@forge/validators";

import {
  dashboardGridClass,
  dashboardNestedSurfaceClass,
  dashboardPanelClass,
  MemberDashboard,
} from "~/app/_components/member/member-dashboard";
import { useDebugLatency } from "~/hooks/use-debug-latency";
import { useMember } from "~/hooks/use-member";

function DashboardSkeleton() {
  return (
    <main className="container py-4 md:py-8 lg:flex lg:min-h-[calc(100svh-4rem)] lg:items-stretch">
      <section className={dashboardGridClass}>
        <Card
          role="region"
          aria-label="Member details loading"
          className={cn(
            dashboardPanelClass,
            "order-2 hidden lg:order-1 lg:flex",
          )}
        >
          <CardContent className="flex h-full flex-col justify-start gap-4 p-4 md:gap-6 md:p-6 lg:overflow-y-auto lg:p-8">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 max-w-full md:h-14 md:w-96" />
            </div>

            {["member", "academics"].map((item) => (
              <div
                key={item}
                className={cn(dashboardNestedSurfaceClass, "p-4")}
              >
                <div className="mb-4 flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="mt-2 h-4 w-32" />
                  </div>
                  <div>
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="mt-2 h-4 w-40" />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card
          role="region"
          aria-label="Guild profile loading"
          className={cn(
            dashboardPanelClass,
            "order-1 flex flex-col lg:order-2",
          )}
        >
          <CardContent className="flex min-h-[calc(100svh-6rem)] flex-1 flex-col gap-4 p-4 pt-5 md:gap-6 md:p-6 md:pt-8 lg:min-h-0 lg:overflow-y-auto">
            <div className="relative flex flex-col items-center text-center">
              <Skeleton className="absolute right-0 top-0 h-9 w-9 rounded-md" />
              <div className="relative">
                <Skeleton className="h-[36vw] max-h-44 min-h-32 w-[36vw] min-w-32 max-w-44 rounded-full border-4 border-background ring-1 ring-white/15 lg:h-32 lg:max-h-none lg:min-h-0 lg:w-32 lg:min-w-0 lg:max-w-none" />
                <Skeleton className="absolute bottom-1 right-1 h-9 w-9 rounded-full border border-background" />
              </div>
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Skeleton className="h-7 w-36 md:h-8 md:w-40" />
                  <Skeleton className="hidden h-5 w-16 rounded-full sm:block" />
                </div>
                <Skeleton className="mx-auto h-4 w-56" />
              </div>
            </div>
            <div className={cn(dashboardNestedSurfaceClass, "p-3 lg:hidden")}>
              <div className="mb-2 flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="mt-3 h-4 w-28" />
            </div>
            <div
              className={cn(
                dashboardNestedSurfaceClass,
                "hidden h-32 p-3 md:p-4 lg:block lg:flex-1",
              )}
            >
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-4 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-11/12" />
              <Skeleton className="mt-2 h-3 w-2/3" />
            </div>
            <div className="hidden gap-3 sm:grid-cols-2 lg:grid lg:grid-cols-1 xl:grid-cols-2">
              {["company", "visibility"].map((item) => (
                <div
                  key={item}
                  className={cn(dashboardNestedSurfaceClass, "p-4")}
                >
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="mt-3 h-4 w-28" />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-12" />
              {["github", "linkedin", "portfolio"].map((item) => (
                <div
                  key={item}
                  className={cn(
                    dashboardNestedSurfaceClass,
                    "flex items-center justify-between px-3 py-2",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-4 w-4" />
                </div>
              ))}
            </div>
            <div className={cn(dashboardNestedSurfaceClass, "p-3")}>
              <div className="mb-3 flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-8 w-14 rounded-md" />
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function DashboardErrorState() {
  return (
    <main className="container py-8 md:py-12">
      <Card className="border-destructive/40 bg-card/95 shadow-xl shadow-black/20">
        <CardContent className="space-y-2 p-6">
          <p className="font-medium text-destructive">
            Dashboard could not load.
          </p>
          <p className="text-sm text-muted-foreground">
            Please refresh and try again.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

export function DashboardClient({
  debugLatencyMs = 0,
}: {
  debugLatencyMs?: number;
}) {
  const isDebugDelayPending = useDebugLatency(debugLatencyMs);
  const { isError, isLoading, isRedirecting, member } = useMember({
    redirectNoMemberTo: `/form/${MEMBER_SIGNUP_FORM_SLUG}`,
  });

  if (isLoading || isRedirecting || isDebugDelayPending) {
    return <DashboardSkeleton />;
  }

  if (isError) return <DashboardErrorState />;

  if (!member) return <DashboardSkeleton />;

  return <MemberDashboard member={member} />;
}
