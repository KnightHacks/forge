import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { api } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Blade | Hackathon",
  description: "Open the currently running Knight Hacks hackathon dashboard.",
};

export default async function CurrentHackathonPage() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  const currentHackathon = await api.hackathon.getCurrentHackathon();

  if (!currentHackathon) {
    return (
      <div className="flex h-screen w-screen items-center justify-center text-center">
        <div className="flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold">
            There's no Hackathon running right now.
          </h1>
          <p className="text-sm text-gray-500">
            Stay on the lookout for the next one by joining our{" "}
            <Link
              href="https://discord.gg/TPYGbdgyaQ"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Discord
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  redirect(`/hackathon/${currentHackathon.name}`);
}
