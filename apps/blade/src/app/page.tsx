import { HydrateClient } from "~/trpc/server";
import { Auth } from "./_components/auth-showcase";
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/dion");
  return null;
}
