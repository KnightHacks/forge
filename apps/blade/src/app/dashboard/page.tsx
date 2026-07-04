import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { SessionNavbar } from "~/app/_components/navigation/session-navbar";
import { UserInterface } from "~/app/_components/user-interface";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Blade | Dashboard",
  description: "Manage your Knight Hacks account.",
};

export default async function Dashboard() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  const member = await api.member.getMember();

  return (
    <HydrateClient>
      <SessionNavbar />
      <main className="container h-screen py-16">
        <UserInterface member={member} />
      </main>
    </HydrateClient>
  );
}
