import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { HydrateClient } from "~/trpc/server";
import { SIGN_IN_PATH } from "~/consts";
import { FormResponderClient } from "./_components/form-responder-client";

export default async function FormResponderPage({ params }: {
    params: { formName: string };  
}) { 
  const session = await auth();
  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  if (!params.formName) {
    return <div>Form not found</div>;
  }

  return (
    <HydrateClient>
      <FormResponderClient formName={params.formName} />
    </HydrateClient>
  );
}   