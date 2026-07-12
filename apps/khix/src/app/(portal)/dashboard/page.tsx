import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth, signIn } from "~/auth/server";
import { getKhixHackathon } from "~/lib/khix-hackathon";
import { AuthRetry } from "../_components/auth-retry";
import { KhixDashboard } from "../_components/khix-dashboard";

export const metadata: Metadata = {
  title: "Knight Hacks IX | Hacker Dashboard",
  description: "Your Knight Hacks IX application dashboard.",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ authError?: string }>;
}) {
  const session = await auth();
  const { authError } = await searchParams;
  if (!session) {
    if (authError) return <AuthRetry callbackPath="/dashboard" />;
    signIn("discord", { redirectTo: "/dashboard" });
  }
  if (!session) redirect("/");

  const khix = await getKhixHackathon();
  if (!khix) redirect("/apply");

  return (
    <KhixDashboard
      sessionUser={{
        discordUserId: session.user.discordUserId,
        email: session.user.email,
        image: session.user.image,
        name: session.user.name,
      }}
    />
  );
}
