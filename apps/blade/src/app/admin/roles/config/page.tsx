import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminConfigConsole } from "~/app/_components/admin/roles/admin-config-console";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Blade | Platform Configuration",
};

export default async function AdminRolesConfigPage() {
  const session = await auth();
  if (!session) redirect("/");

  // Officer-only, checked before either console read is awaited so a
  // non-officer never has the data on the wire. `/admin/roles` rather than the
  // member dashboard: a CONFIGURE_ROLES holder reaching this URL followed the
  // link from a section they legitimately hold.
  const permissions = await api.roles.getPermissions();
  if (permissions.IS_OFFICER !== true) redirect("/admin/roles");

  const [discord, clubTeams] = await Promise.all([
    api.discordConfig.list(),
    api.clubTeams.listConfiguration(),
  ]);

  return <AdminConfigConsole clubTeams={clubTeams} discord={discord} />;
}
