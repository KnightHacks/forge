import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import { AlumniBulletinAdmin } from "~/app/_components/admin/alumni/alumni-bulletin-admin";
import { canAccessAlumniAdmin } from "~/lib/admin-access";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  description: "Manage the private Knight Hacks alumni bulletin.",
  title: "Blade | Alumni Admin",
};

export default async function AlumniAdminPage() {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await api.roles.getPermissions();
  if (!canAccessAlumniAdmin(permissions)) redirect(MEMBER_DASHBOARD_PATH);

  const [posts, forms] = await Promise.all([
    api.alumni.listBulletinAdmin(),
    api.alumni.listLinkableForms(),
  ]);

  return <AlumniBulletinAdmin forms={forms} posts={posts} />;
}
