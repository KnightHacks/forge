import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MEMBER_SIGNUP_FORM_SLUG } from "@forge/validators";

import { AuthenticatedShell } from "~/app/_components/member/authenticated-shell";
import { getMemberDebugLatencyMs } from "~/app/_components/member/debug-latency";
import { MemberProfileSettingsForm } from "~/app/_components/member/member-profile-settings-form";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

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
  const member = await api.member.getMember();

  if (!member) redirect(`/form/${MEMBER_SIGNUP_FORM_SLUG}`);

  return (
    <HydrateClient>
      <AuthenticatedShell session={session}>
        <MemberProfileSettingsForm
          member={member}
          debugLatencyMs={debugLatencyMs}
        />
      </AuthenticatedShell>
    </HydrateClient>
  );
}
