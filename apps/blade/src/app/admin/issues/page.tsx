import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { CreateEditDialog } from "~/app/_components/issues/create-edit-dialog";
import IssueTemplate from "~/app/_components/issues/issue-template-dialog";
import { SIGN_IN_PATH } from "~/consts";
import { api } from "~/trpc/server";

export default async function Page() {
  const session = await auth();
  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  const hasAccess = await api.roles.hasPermission({
    or: ["IS_OFFICER"],
  });
  if (!hasAccess) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <CreateEditDialog>
        <button className="rounded bg-blue-600 px-4 py-2 text-sm text-white">
          [DEV] Open Issue Dialog
        </button>
      </CreateEditDialog>
      <IssueTemplate />
    </div>
  );
}
