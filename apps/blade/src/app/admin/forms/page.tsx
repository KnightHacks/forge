import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { SIGN_IN_PATH } from "~/consts";
import { api } from "~/trpc/server";
import FormsClient from "../../_components/admin/forms/homepage";

export default async function Page() {
  const session = await auth();
  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  const hasAccess = await api.roles.hasPermission({
    or: ["READ_FORMS", "EDIT_FORMS"],
  });
  if (!hasAccess) {
    redirect("/");
  }

  return <FormsClient />;
}
