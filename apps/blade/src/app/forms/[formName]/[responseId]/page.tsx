import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";
import { FormReviewClient } from "../_components/form-view-edit-client";

export default async function FormResponderPage({
  params,
}: {
  params: { responseId: string, formName: string };
}) {
  const session = await auth();
  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  if (!params.responseId) {
    return <div>Submission not found</div>;
  }

  // handle url encode form names to allow spacing and special characters
  const formName = params.formName;
  const responseId = params.responseId;

  // use blade member name instead of discord name
  let userName = session.user.name || "Member";
  try {
    const member = await api.member.getMember();
    if (member?.firstName) {
      userName = member.firstName;
    }
  } catch {
    // fallback to discord name if member lookup fails
  }

  return (
    <HydrateClient>
      <FormReviewClient formName={formName} userName={userName} responseId={responseId} />
    </HydrateClient>
  );
} 
