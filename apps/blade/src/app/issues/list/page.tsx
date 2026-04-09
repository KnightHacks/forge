import { notFound, redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { IssuesList } from "~/app/_components/issue-list/issues-list";
import { SessionNavbar } from "~/app/_components/navigation/session-navbar";
import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";

export default async function IssueListPage() {
  const session = await auth();
  if (!session) redirect(SIGN_IN_PATH);

  const hasAccess = await api.roles.hasPermission({
    and: [
      "READ_ISSUES",
      "EDIT_ISSUES",
      "EDIT_ISSUE_TEMPLATES",
      "READ_ISSUE_TEMPLATES",
    ],
  });
  if (!hasAccess) notFound();

  return (
    <HydrateClient>
      <SessionNavbar />
      <main className="px-4 pb-4 md:px-6 md:pb-6">
        <IssuesList />
      </main>
    </HydrateClient>
  );
}
