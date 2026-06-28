import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import type { AdminMemberSearchParams } from "~/app/_components/admin/members/params";
import { canAccessMemberAdmin } from "~/app/_components/admin/access";
import { MemberAdminDashboard } from "~/app/_components/admin/members/member-admin-dashboard";
import { parseAdminMemberSearchParams } from "~/app/_components/admin/members/params";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Blade | Member Admin",
  description: "Manage Knight Hacks member records and dues.",
};

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<AdminMemberSearchParams>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const effectivePermissions = await api.roles.getPermissions();
  if (!canAccessMemberAdmin(effectivePermissions)) {
    redirect(MEMBER_DASHBOARD_PATH);
  }

  const { input, selectedMemberId } = parseAdminMemberSearchParams(
    await searchParams,
  );
  const [data, detail] = await Promise.all([
    api.member.getAdminMembers(input),
    selectedMemberId
      ? api.member
          .getAdminMember({ memberId: selectedMemberId })
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  return (
    <HydrateClient>
      <MemberAdminDashboard
        key={input.query}
        canEdit={
          effectivePermissions.IS_OFFICER === true ||
          effectivePermissions.EDIT_MEMBERS === true
        }
        data={data}
        detail={detail}
        input={input}
        isOfficer={effectivePermissions.IS_OFFICER === true}
      />
    </HydrateClient>
  );
}
