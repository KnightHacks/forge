import type { Metadata } from "next";
import { redirect } from "next/navigation";

import type { api as serverCall } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Hacker Dashboard",
  description: "The official Knight Hacks Hacker Dashboard",
};

export default function HackerDashboard({
  hacker,
}: {
  hacker: Awaited<ReturnType<(typeof serverCall.hacker)["getHacker"]>>;
}) {
  if (!hacker) {
    redirect("/");
  }

  return <div className="mx-auto">Work in progress...</div>;
}
