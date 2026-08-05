import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TRPCError } from "@trpc/server";

import {
  formDefinitionSchema,
  MEMBER_SIGNUP_FORM_SLUG,
  memberSignupFormDefinition,
} from "@forge/validators";

import { GenericFormRespondent } from "~/app/_components/forms/generic-form-respondent";
import { GenericFormResponseForm } from "~/app/_components/forms/generic-form-response-form";
import { MemberSignupForm } from "~/app/_components/member/member-signup-form";
import { AuthenticatedShell } from "~/app/_components/shared/authenticated-shell";
import { getAdminNavigationAccess } from "~/lib/admin-access";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

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
    /*
      An unknown slug is a 404, not a 500.

      `getFormBySlug` throws NOT_FOUND, and nothing caught it — so
      `/form/anything` rendered Next's error boundary and returned a server
      error. A mistyped or expired form link is an ordinary miss, and reporting
      it as a crash both misleads the person and buries real failures in the
      logs. Same handling as `admin/hackathon/[id]`.
    */
    let result;
    try {
      result = await api.forms.getRespondentForm({
        responseId,
        slugName: slug,
      });
    } catch (error) {
      if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
      throw error;
    }
    const definition = formDefinitionSchema.parse(result.definition);
    const respondentState =
      result.respondentState.status === "scheduled"
        ? {
            opensAt: result.respondentState.opensAt?.toISOString() ?? null,
            status: "scheduled" as const,
          }
        : result.respondentState.status === "closed"
          ? {
              closedAt: result.respondentState.closedAt?.toISOString() ?? null,
              status: "closed" as const,
            }
          : result.respondentState.status === "submitted"
            ? {
                answers: Object.entries(result.respondentState.answers).map(
                  ([questionId, value]) => ({ questionId, value }),
                ),
                editable: result.respondentState.editable,
                responseId: result.respondentState.responseId,
                status: "submitted" as const,
                submittedAt: result.respondentState.submittedAt.toISOString(),
              }
            : { status: result.respondentState.status };

    return (
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
                  ? result.respondentState.answers
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
  );
}
