import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { api } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Blade | Current Hackathon",
  description: "Open the currently running Knight Hacks hackathon dashboard.",
};

export default async function CurrentHackathonPage() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  const currentHackathon = await api.hackathon.getCurrentHackathon();

  if (!currentHackathon) {
    redirect("/dashboard");
  }

  redirect(`/hackathon/${currentHackathon.name}`);
}
