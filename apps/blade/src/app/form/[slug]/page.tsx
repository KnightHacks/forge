import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import {
  MEMBER_SIGNUP_FORM_SLUG,
  memberSignupFormDefinition,
} from "@forge/validators";

import { canAccessMemberAdmin } from "~/app/_components/admin/access";
import { AuthenticatedShell } from "~/app/_components/member/authenticated-shell";
import { MemberSignupForm } from "~/app/_components/member/member-signup-form";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Blade | Form",
  description: "Complete a Knight Hacks form.",
};

export default async function FormPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  if (!session) redirect("/");
  if (slug !== MEMBER_SIGNUP_FORM_SLUG) notFound();

  const [form, member, effectivePermissions] = await Promise.all([
    api.forms.getForm({ slugName: slug }),
    api.member.getMember(),
    api.roles.getPermissions(),
  ]);
  const completionRedirectUrl =
    form.completionRedirectUrl ??
    memberSignupFormDefinition.completionRedirectUrl;

  if (member) redirect(completionRedirectUrl);

  return (
    <HydrateClient>
      <AuthenticatedShell
        canAccessAdmin={canAccessMemberAdmin(effectivePermissions)}
        session={session}
      >
        <MemberSignupForm
          definition={{
            ...memberSignupFormDefinition,
            completionRedirectUrl,
            id: form.id,
            slugName: form.slugName,
          }}
        />
      </AuthenticatedShell>
    </HydrateClient>
  );
}
