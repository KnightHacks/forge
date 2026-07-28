import type { Metadata } from "next";
import { redirect } from "next/navigation";

import type { RouterOutputs } from "@forge/api";
import { MEMBER_SIGNUP_FORM_SLUG } from "@forge/validators";

import { DashboardClient } from "~/app/_components/member/dashboard-client";
import { getMemberDebugLatencyMs } from "~/app/_components/member/debug-latency";
import { AuthenticatedShell } from "~/app/_components/shared/authenticated-shell";
import { getAdminNavigationAccess } from "~/lib/admin-access";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Blade | Member Dashboard",
  description: "Manage your Knight Hacks member profile.",
};

export default async function MemberDashboardPage({
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

  const alumni = await api.alumni.getDashboard().catch(() => null);
  const showsCurrentMember = alumni?.mode === "current";
  const noFeedback: RouterOutputs["event"]["listMyFeedback"] = [];
  const [duesStatus, events, attendance, feedbackRows] = await Promise.all([
    showsCurrentMember ? api.dues.getStatus().catch(() => null) : null,
    showsCurrentMember ? api.event.listMemberEvents().catch(() => null) : null,
    showsCurrentMember
      ? api.event.listMemberAttendance().catch(() => null)
      : null,
    showsCurrentMember
      ? api.event.listMyFeedback().catch(() => noFeedback)
      : noFeedback,
  ]);

  return (
    <AuthenticatedShell
      adminNavigation={getAdminNavigationAccess(effectivePermissions)}
      session={session}
    >
      <DashboardClient
        alumni={alumni}
        attendance={attendance}
        debugLatencyMs={debugLatencyMs}
        duesStatus={duesStatus}
        events={events}
        feedback={feedbackRows
          .filter(
            (
              feedback,
            ): feedback is Exclude<
              typeof feedback,
              { status: "not_applicable" }
            > => "dueAt" in feedback,
          )
          .map((feedback) => ({
            ...feedback,
            dueAt: feedback.dueAt.toISOString(),
            ...(feedback.status === "completed"
              ? { submittedAt: feedback.submittedAt.toISOString() }
              : {}),
          }))}
        member={member}
      />
    </AuthenticatedShell>
  );
}
