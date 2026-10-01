import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import { PointStoreWorkspace } from "~/app/_components/admin/point-store/point-store-workspace";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export const metadata: Metadata = { title: "Blade | Point Store" };

export default async function PointStorePage({
  searchParams,
}: {
  searchParams: Promise<{ hackathonId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");
  const permissions = await api.roles.getPermissions();
  if (!permissions.EDIT_HACKERS) redirect(MEMBER_DASHBOARD_PATH);
  const hackathons = await api.pointStore.hackathons();
  const { hackathonId } = await searchParams;
  const selectedId =
    hackathons.find((hack) => hack.id === hackathonId)?.id ?? hackathons[0]?.id;
  return (
    <PointStoreWorkspace
      key={selectedId}
      hackathons={hackathons}
      hackathonId={selectedId}
    />
  );
}
