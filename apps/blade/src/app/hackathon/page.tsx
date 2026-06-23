import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Blade | Hackathon",
  description: "Open the running Knight Hacks hackathon dashboard.",
};

export default function HackathonIndexPage() {
  redirect("/hackathon/current");
}
