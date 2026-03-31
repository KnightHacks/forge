import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import Calendar from "~/app/_components/calendar/calendar";
import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";

export default async function Events() {
  const session = await auth();
  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  const hasAccess = await api.roles.hasPermission({
    or: ["EDIT_ISSUE_TEMPLATES", "READ_ISSUE_TEMPLATES"],
  });

  if (!hasAccess) {
    redirect("/");
  }

  return (
    <HydrateClient>
      <main className="container h-screen">
        <Calendar />
      </main>
    </HydrateClient>
  );
}
