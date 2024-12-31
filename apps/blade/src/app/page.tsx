import { auth } from "@forge/auth";

import { HydrateClient } from "~/trpc/server";
import { AuthShowcase } from "./_components/auth-showcase";
import { SessionNavbar } from "./_components/navigation/session-navbar";
import { UserInterface } from "./_components/user-interface";

export default async function HomePage() {
  const session = await auth();

  return (
    <HydrateClient>
      {session && <SessionNavbar />}
      <main className="container h-screen py-16">
        {session ? <UserInterface /> : <AuthShowcase />}
      </main>
    </HydrateClient>
  );
}
