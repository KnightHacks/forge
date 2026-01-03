import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { SIGN_IN_PATH } from "~/consts";
import { HydrateClient } from "~/trpc/server";
import { FormResponderClient } from "./_components/form-responder-client";

export default async function FormResponderPage({
  params,
}: {
  params: { formName: string };
}) {
  const session = await auth();
  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  if (!params.formName) {
    return <div>Form not found</div>;
  }

  // handle url encode form names to allow spacing and special characters
  const formName = decodeURIComponent(params.formName);

  const userName = session.user.name ?? "Member";

  return (
    <HydrateClient>
      <FormResponderClient formName={formName} userName={userName} />
    </HydrateClient>
  );
}
