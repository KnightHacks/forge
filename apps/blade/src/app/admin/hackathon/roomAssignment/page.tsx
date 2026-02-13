import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";
import { ChallengesTable } from "~/app/_components/admin/hackathon/roomAssignment/ChallengesTable";

export const metadata: Metadata = {
  title: "Blade | Room Assignment",
  description: "Assign room and populate judges information",
};

export default async function Hackers() {
  const session = await auth();
  if (!session) redirect(SIGN_IN_PATH);

  const hasAccess = await api.roles.hasPermission({
    or: ["IS_JUDGE"],
  });
  if (!hasAccess) redirect("/");

  const currentHackathon = await api.hackathon.getCurrentHackathon();
  if (!currentHackathon) return <p> Hackathon Not Found </p>;

  return (
    <HydrateClient>
      <ChallengesTable hackathonId={currentHackathon.id} />
    </HydrateClient>
  );
}
