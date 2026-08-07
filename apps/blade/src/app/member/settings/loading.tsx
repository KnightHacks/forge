import { MemberProfileSettingsSkeleton } from "~/app/_components/member/member-profile-settings-form";
import { AuthenticatedShellSkeleton } from "~/app/_components/shared/authenticated-shell-skeleton";

export default function MemberSettingsLoading() {
  return (
    <AuthenticatedShellSkeleton>
      <MemberProfileSettingsSkeleton />
    </AuthenticatedShellSkeleton>
  );
}
