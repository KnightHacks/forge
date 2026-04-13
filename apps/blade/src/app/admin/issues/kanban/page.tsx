import { notFound, redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { KanbanBoard } from "~/app/_components/issue-kanban/issues-kanban";
import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";

export default async function AdminIssuesKanbanPage() {
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
      <main className="flex h-[calc(100dvh-5rem)] min-h-0 flex-col overflow-y-auto px-4 pb-4 md:px-6 md:pb-6">
        <KanbanBoard />
      </main>
    </HydrateClient>
  );
}
