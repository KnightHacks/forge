import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  formDefinitionSchema,
  MEMBER_SIGNUP_FORM_SLUG,
  memberSignupFormDefinition,
} from "@forge/validators";

import { getAdminNavigationAccess } from "~/app/_components/admin/access";
import { GenericFormRespondent } from "~/app/_components/forms/generic-form-respondent";
import { GenericFormResponseForm } from "~/app/_components/forms/generic-form-response-form";
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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ responseId?: string }>;
}) {
  const { slug } = await params;
  const { responseId } = await searchParams;
  const session = await auth();

  if (!session) redirect("/");
  const effectivePermissions = await api.roles.getPermissions();

  if (slug !== MEMBER_SIGNUP_FORM_SLUG) {
    const result = await api.forms.getRespondentForm({
      responseId,
      slugName: slug,
    });
    const definition = formDefinitionSchema.parse(result.definition);
    const respondentState =
      result.respondentState.status === "scheduled"
        ? {
            opensAt:
              result.respondentState.opensAt?.toISOString() ??
              new Date().toISOString(),
            status: "scheduled" as const,
          }
        : result.respondentState.status === "closed"
          ? {
              closedAt:
                result.respondentState.closedAt?.toISOString() ??
                new Date().toISOString(),
              reason: result.respondentState.reason,
              status: "closed" as const,
            }
          : result.respondentState.status === "submitted"
            ? {
                answers: Object.entries(
                  result.respondentState.answers,
                ).map(([questionId, value]) => ({ questionId, value })),
                editable: result.respondentState.editable,
                responseId: result.respondentState.responseId,
                status: "submitted" as const,
                submittedAt: result.respondentState.submittedAt.toISOString(),
              }
            : { status: "open" as const };

    return (
      <HydrateClient>
        <AuthenticatedShell
          adminNavigation={getAdminNavigationAccess(effectivePermissions)}
          sectionLabel="Member form"
          session={session}
        >
          <GenericFormRespondent
            definition={{
              description: definition.description,
              id: result.form.id,
              name: result.form.name,
              questions: definition.questions,
              responseMode: result.form.responseMode,
              slugName: result.form.slugName,
            }}
            openForm={
              <GenericFormResponseForm
                definition={definition}
                formId={result.form.id}
                initialAnswers={
                  result.respondentState.status === "submitted"
                    ? (result.respondentState.answers)
                    : undefined
                }
                mode={
                  result.respondentState.status === "submitted" &&
                  result.respondentState.editable
                    ? "edit"
                    : "create"
                }
              />
            }
            respondentState={respondentState}
          />
        </AuthenticatedShell>
      </HydrateClient>
    );
  }

  const [form, member] = await Promise.all([
    api.forms.getForm({ slugName: slug }),
    api.member.getMember(),
  ]);
  const completionRedirectUrl =
    form.completionRedirectUrl ??
    memberSignupFormDefinition.completionRedirectUrl;

  if (member) redirect(completionRedirectUrl);

  return (
    <HydrateClient>
      <AuthenticatedShell
        adminNavigation={getAdminNavigationAccess(effectivePermissions)}
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
