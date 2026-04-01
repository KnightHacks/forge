import { notFound, redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { SIGN_IN_PATH } from "~/consts";
import { SessionNavbar } from "~/app/_components/navigation/session-navbar";
import { api, HydrateClient } from "~/trpc/server";
import { CreateIssueButton } from "~/app/_components/issues/create-issue-button";

export default async function IssueListPage() {
  const session = await auth();
  if (!session) redirect(SIGN_IN_PATH);

  const hasAccess = await api.roles.hasPermission({ or: ["READ_ISSUES"] });
  if (!hasAccess) notFound();

  return (
    <HydrateClient>
      <SessionNavbar />
      <main className="px-4 pb-4 md:px-6 md:pb-6">
        <CreateIssueButton />
      </main>
    </HydrateClient>
  );
}
