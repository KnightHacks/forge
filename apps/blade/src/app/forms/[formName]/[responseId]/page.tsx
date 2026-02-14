import { redirect } from "next/navigation";

import { auth } from "@forge/auth/server";

import FormNotFound from "~/app/_components/forms/form-not-found";
import { FormReviewWrapper } from "~/app/_components/forms/form-view-edit-client";
import ResponseNotFound from "~/app/_components/forms/response-not-found";
import { api, HydrateClient } from "~/trpc/server";

function serializeSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const entry of value) {
        params.append(key, entry);
      }
      continue;
    }
    params.set(key, value);
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export default async function FormResponderPage({
  params,
  searchParams,
}: {
  params: { responseId: string; formName: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await auth();
  if (!session) {
    const callbackURL =
      `/forms/${encodeURIComponent(params.formName)}/${encodeURIComponent(params.responseId)}` +
      serializeSearchParams(searchParams);
    redirect(`/?callbackURL=${encodeURIComponent(callbackURL)}`);
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
