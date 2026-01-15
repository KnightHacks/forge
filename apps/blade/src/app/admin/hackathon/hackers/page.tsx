import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";
import HackerClient from "./hacker-client";

export const metadata: Metadata = {
  title: "Blade | Judge Assignment",
  description: "Generate Magic Links for Judges",
};

export default async function Hackers() {
  const session = await auth();
  if (!session) redirect(SIGN_IN_PATH);

  const isAdmin = await api.roles.hasPermission({or: ["READ_HACKERS", "CHECKIN_HACK_EVENT", "READ_HACK_EVENT"]});
  if (!isAdmin) redirect("/");

  const currentActiveHackathon = await api.hackathon.getCurrentHackathon();

  return (
    <HydrateClient>
      <HackerClient currentActiveHackathon={currentActiveHackathon ?? null} />
    </HydrateClient>
  );
}
