import Link from "next/link";

import { auth } from "@forge/auth";

import { api, HydrateClient } from "~/trpc/server";
import { AuthShowcase } from "./_components/auth-showcase";

export default async function HomePage() {
  const session = await auth();
  const isMember = async () => {
    const member = await api.member.getMember();

    if (member) {
      return <Link href={"/member/dashboard"}>Dashboard</Link>;
    } else {
      return <Link href={"/member/application"}>Member Signup</Link>;
    }
  };

  return (
    <HydrateClient>
      <main className="container h-screen py-16">
        <div className="flex flex-col items-center justify-center gap-4">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            Forge
          </h1>
          <AuthShowcase />
          {session ? isMember() : <p></p>}
        </div>
      </main>
    </HydrateClient>
  );
}
