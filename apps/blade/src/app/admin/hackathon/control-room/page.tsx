import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import ControlRoomClient from "~/app/_components/admin/hackathon/control-room/control-room-client";
import { api, HydrateClient } from "~/trpc/server";

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
