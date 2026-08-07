import { MemberDuesSkeleton } from "~/app/_components/member/member-dues-payment";
import { AuthenticatedShellSkeleton } from "~/app/_components/shared/authenticated-shell-skeleton";

export default function MemberDuesLoading() {
  return (
    <AuthenticatedShellSkeleton>
      <MemberDuesSkeleton />
    </AuthenticatedShellSkeleton>
  );
}
