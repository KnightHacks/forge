import { DashboardSkeleton } from "~/app/_components/member/dashboard-client";
import { AuthenticatedShellSkeleton } from "~/app/_components/shared/authenticated-shell-skeleton";

export default function MemberDashboardLoading() {
  return (
    <AuthenticatedShellSkeleton>
      <DashboardSkeleton />
    </AuthenticatedShellSkeleton>
  );
}
