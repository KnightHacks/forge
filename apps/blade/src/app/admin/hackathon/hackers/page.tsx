import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";
import HackerClient from "./hacker-client";

export const metadata: Metadata = {
  title: "Blade | Hackers",
  description: "Manage Knight Hacks hackers.",
};

export default async function Hackers() {
  const session = await auth();
  if (!session) redirect(SIGN_IN_PATH);

  const isAdmin = await api.auth.getAdminStatus();
  if (!isAdmin) redirect("/");

  const currentActiveHackathon = await api.hackathon.getCurrentHackathon();

  return (
    <HydrateClient>
      {/* moved entire page.tsx to hackers-client.tsx cause i needed to use useState */}
      <HackerClient currentActiveHackathon={currentActiveHackathon ?? null} />
    </HydrateClient>
  );
}
