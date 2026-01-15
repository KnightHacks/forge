import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";
import { ChallengesTable } from "./_components/ChallengesTable";

export const metadata: Metadata = {
  title: "Blade | Room Assignment",
  description: "Assign room and populate judges information",
};

export default async function Hackers() {
  const session = await auth();
  if (!session) redirect(SIGN_IN_PATH);

  const isAdmin = await api.roles.hasPermission({or: ["EDIT_HACKERS", "EDIT_HACK_EVENT"]});
  if (!isAdmin) redirect("/");

  const currentHackathon = await api.hackathon.getCurrentHackathon();
  if (!currentHackathon) return <p> Hackathon Not Found </p>;

  return (
    <HydrateClient>
      <ChallengesTable hackathonId={currentHackathon.id} />
    </HydrateClient>
  );
}
