import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MEMBER_SIGNUP_FORM_SLUG } from "@forge/validators";

import { getMemberDebugLatencyMs } from "~/app/_components/member/debug-latency";
import { MemberProfileSettingsForm } from "~/app/_components/member/member-profile-settings-form";
import { AuthenticatedShell } from "~/app/_components/shared/authenticated-shell";
import { getAdminNavigationAccess } from "~/lib/admin-access";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Blade | Member Settings",
  description: "Edit your Knight Hacks member profile.",
};

export default async function MemberSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();

  if (!session) redirect("/");

  const debugLatencyMs = getMemberDebugLatencyMs(await searchParams);
  const [member, effectivePermissions] = await Promise.all([
    api.member.getMember(),
    api.roles.getPermissions(),
  ]);

  if (!member) redirect(`/form/${MEMBER_SIGNUP_FORM_SLUG}`);

  const careerData = await api.career.listMyEmployment();

  return (
    <AuthenticatedShell
      activeNavigation="settings"
      adminNavigation={getAdminNavigationAccess(effectivePermissions)}
      session={session}
    >
      <MemberProfileSettingsForm
        member={member}
        careerData={careerData}
        debugLatencyMs={debugLatencyMs}
      />
    </AuthenticatedShell>
  );
}
