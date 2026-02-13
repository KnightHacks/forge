import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { api, HydrateClient } from "~/trpc/server";
import ControlRoomClient from "~/app/_components/admin/hackathon/control-room/control-room-client";

export default async function ControlRoom() {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  const hasAccess = await api.roles.hasPermission({ and: ["IS_OFFICER"] });
  if (!hasAccess) {
    redirect("/");
  }

  return (
    <HydrateClient>
      <ControlRoomClient />
    </HydrateClient>
  );
}
