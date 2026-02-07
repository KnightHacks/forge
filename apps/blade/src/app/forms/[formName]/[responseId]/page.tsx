import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";
import FormNotFound from "../_components/form-not-found";
import { FormReviewWrapper } from "../_components/form-view-edit-client";
import ResponseNotFound from "../_components/response-not-found";

export default async function FormResponderPage({
  params,
}: {
  params: { responseId: string; formName: string };
}) {
  const session = await auth();
  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  if (!params.formName) {
    return <FormNotFound />;
  }

  if (!params.responseId) {
    return <ResponseNotFound />;
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
      <FormReviewWrapper
        formName={formName}
        userName={userName}
        responseId={responseId}
      />
    </HydrateClient>
  );
}
