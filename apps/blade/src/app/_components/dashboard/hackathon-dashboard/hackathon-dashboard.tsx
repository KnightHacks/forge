import type { Metadata } from "next";

import type { SelectHackathon } from "@forge/db/schemas/knight-hacks";

import type { api as serverCall } from "~/trpc/server";
import { api } from "~/trpc/server";
import { BaseHackathonDashboard, HackathonProvider } from "./components";

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

  return (
    <HackathonProvider hackathon={activeHackathon}>
      {activeHackathon ? <BaseHackathonDashboard hacker={hacker} /> : null}
    </HackathonProvider>
  );
}
