import Link from "next/link";

import { auth } from "@forge/auth";

import { HydrateClient } from "~/trpc/server";

export default async function Admin() {
  const session = await auth();
  // will add admin auth if it becomes a thing

  return (
    <HydrateClient>
      <main className="container h-screen py-16">
        <div className="flex flex-col items-center justify-center gap-4">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            Admin
          </h1>
          {session ? (
            <>
              <Link href={"/admin/members"}>Member Dashboard</Link>
              <Link href={"/admin/events"}>Event Dashboard</Link>
            </>
          ) : (
            "You are not authenticated to use this service!"
          )}
        </div>
      </main>
    </HydrateClient>
  );
}
