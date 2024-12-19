import Link from "next/link";

import { auth } from "@forge/auth";
import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Member } from "@forge/db/schemas/knight-hacks";

import { HydrateClient } from "~/trpc/server";
import { AuthShowcase } from "./_components/auth-showcase";

export default async function HomePage() {
  const session = await auth();

  // checks if the user is signed in
  // if so, it checks to see if the user is a member
  // if not, they are displayed a sign-up link
  // otherwise, if they are a member, they will be shown the dashboard link
  if (session) {
    const member = await db.query.Member.findFirst({
      where: eq(Member.userId, session.user.id),
    });
    if (member) {
      return (
        <HydrateClient>
          <main className="container h-screen py-16">
            <div className="flex flex-col items-center justify-center gap-4">
              <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
                Forge
              </h1>

              <Link href={"/member/dashboard"}>Dashboard</Link>

              <AuthShowcase />
            </div>
          </main>
        </HydrateClient>
      );
    }
  }

  return (
    <HydrateClient>
      <main className="container h-screen py-16">
        <div className="flex flex-col items-center justify-center gap-4">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            Forge
          </h1>

          <Link href="/member/application">Member Sign-Up</Link>

          <AuthShowcase />
        </div>
      </main>
    </HydrateClient>
  );
}
