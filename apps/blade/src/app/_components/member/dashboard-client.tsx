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
import { useMember } from "~/hooks/use-member";

function DashboardSkeleton() {
  return (
    <main className="container py-6 md:py-8 lg:flex lg:min-h-[calc(100svh-4rem)] lg:items-stretch">
      <section className={dashboardGridClass}>
        <Card className={dashboardPanelClass}>
          <CardContent className="flex h-full flex-col justify-start gap-6 p-6 lg:overflow-y-auto lg:p-8">
            <div className="space-y-2">
              <Skeleton className="h-9 w-64 max-w-full md:h-14 md:w-96" />
            </div>

            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-3">
                {["email", "school", "shirt"].map((item) => (
                  <div
                    key={item}
                    className={cn(dashboardNestedSurfaceClass, "p-4")}
                  >
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="mt-4 h-3 w-16" />
                    <Skeleton className="mt-2 h-4 w-28 max-w-full" />
                  </div>
                ))}
              </div>

              <div className={cn(dashboardNestedSurfaceClass, "p-4")}>
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

              <div className={cn(dashboardNestedSurfaceClass, "p-4")}>
                <div className="mb-4 flex items-center gap-3">
                  <Skeleton className="h-10 w-10" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-64 max-w-full" />
                  </div>
                </div>
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(dashboardPanelClass, "flex flex-col")}>
          <CardContent className="flex flex-1 flex-col gap-6 overflow-y-auto p-6 pt-8">
            <div className="flex flex-col items-center text-center">
              <Skeleton className="h-32 w-32 rounded-full" />
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Skeleton className="h-8 w-40" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="mx-auto h-4 w-56" />
              </div>
            </div>
            <div
              className={cn(dashboardNestedSurfaceClass, "h-32 p-4 lg:flex-1")}
            >
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-4 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-11/12" />
              <Skeleton className="mt-2 h-3 w-2/3" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
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
              {["github", "linkedin", "portfolio"].map((item) => (
                <div
                  key={item}
                  className={cn(
                    dashboardNestedSurfaceClass,
                    "flex items-center justify-between px-3 py-2",
                  )}
                >
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
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

export function DashboardClient() {
  const { isError, isLoading, isRedirecting, member } = useMember({
    redirectNoMemberTo: `/form/${MEMBER_SIGNUP_FORM_SLUG}`,
  });

  if (isLoading || isRedirecting) return <DashboardSkeleton />;

  if (isError) return <DashboardErrorState />;

  if (!member) return <DashboardSkeleton />;

  return <MemberDashboard member={member} />;
}
