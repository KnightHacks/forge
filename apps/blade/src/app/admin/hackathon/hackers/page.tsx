import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import HackerClient from "~/app/_components/admin/hackathon/hackers/hacker-client";
import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";

export default async function Hackers() {
  const session = await auth();
  if (!session) redirect(SIGN_IN_PATH);

  const hasAccess = await api.roles.hasPermission({
    or: ["READ_HACKERS", "EDIT_HACKERS"],
  });
  if (!hasAccess) redirect("/");

  const currentActiveHackathon = await api.hackathon.getCurrentHackathon();

  return (
    <HydrateClient>
      <HackerClient currentActiveHackathon={currentActiveHackathon ?? null} />
    </HydrateClient>
  );
}
