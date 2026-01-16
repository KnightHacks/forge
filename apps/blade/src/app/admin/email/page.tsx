import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { EmailDash } from "~/app/_components/emailDash";
import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";

export default async function AdminEmail() {
  const session = await auth();
  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  const hasAccess = await api.roles.hasPermission({
    or: ["EMAIL_PORTAL"],
  });

  if (!hasAccess) {
    redirect("/");
  }

  return (
    <HydrateClient>
      <EmailDash />
    </HydrateClient>
  );
}
