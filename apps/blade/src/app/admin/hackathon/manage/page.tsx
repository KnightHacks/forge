import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { HackathonManager } from "~/app/_components/admin/hackathon/manage/hackathon-manager";
import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";

export default async function HackathonManagePage() {
  const session = await auth();
  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  const hasAccess = await api.roles.hasPermission({
    and: ["IS_OFFICER"],
  });

  if (!hasAccess) {
    redirect("/");
  }

  return (
    <HydrateClient>
      <HackathonManager />
    </HydrateClient>
  );
}
