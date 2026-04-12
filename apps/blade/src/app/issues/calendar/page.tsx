import { notFound, redirect } from "next/navigation";

import { auth } from "@forge/auth";

import Calendar from "~/app/_components/calendar/calendar";
import { SessionNavbar } from "~/app/_components/navigation/session-navbar";
import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";

export default async function Events() {
  const session = await auth();
  if (!session) {
    redirect(SIGN_IN_PATH);
  }

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
      <div className="flex h-dvh flex-col overflow-hidden">
        <div className="shrink-0">
          <SessionNavbar />
        </div>
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 pt-2 md:px-6 md:pb-6">
          <Calendar />
        </main>
      </div>
    </HydrateClient>
  );
}
