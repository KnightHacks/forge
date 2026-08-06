import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import { HackathonEventsWorkspace } from "~/app/_components/admin/hackathon-events/hackathon-events-workspace";
import {
  canAccessHackathonEvents,
  canEditHackathonEvents,
} from "~/lib/admin-access";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  description: "Manage one hackathon's schedule and event integrations.",
  title: "Blade | Hackathon Events",
};

export default async function AdminHackathonEventsPage() {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await api.roles.getPermissions();
  if (!canAccessHackathonEvents(permissions)) redirect(MEMBER_DASHBOARD_PATH);

  return (
    <HackathonEventsWorkspace
      canEdit={canEditHackathonEvents(permissions)}
      isOfficer={permissions.IS_OFFICER === true}
    />
  );
}
