import type { Metadata } from "next";

import type { SelectHackathon } from "@forge/db/schemas/knight-hacks";

import type { api as serverCall } from "~/trpc/server";
import { api } from "~/trpc/server";
import { BaseHackathonDashboard } from "./components";

export const metadata: Metadata = {
  title: "Hacker Dashboard",
  description: "The official Knight Hacks Hacker Dashboard",
};

export default async function HackathonDashboard({
  hackathon,
  hacker,
}: {
  hackathon?: SelectHackathon | null;
  hacker: Awaited<ReturnType<(typeof serverCall.hackerQuery)["getHacker"]>>;
}) {
  const activeHackathon =
    hackathon ?? (await api.hackathon.getCurrentHackathon());

  if (!activeHackathon) {
    return (
      <div className="flex flex-col items-center justify-center gap-y-6 text-xl font-semibold">
        <p className="w-full max-w-xl text-center text-2xl">
          There is not a hackathon running right now.
        </p>
      </div>
    );
  }

  return <BaseHackathonDashboard hackathon={activeHackathon} hacker={hacker} />;
}
