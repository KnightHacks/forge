import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth, signIn } from "~/auth/server";
import { getKhixHackathon } from "~/lib/khix-hackathon";
import { AuthRetry } from "../../_components/auth-retry";
import { KhixProfile } from "../../_components/khix-dashboard";

export const metadata: Metadata = {
  title: "Knight Hacks IX | Profile",
  description:
    "Review the profile details attached to your Knight Hacks IX application.",
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ authError?: string }>;
}) {
  const session = await auth();
  const { authError } = await searchParams;
  if (!session) {
    if (authError) return <AuthRetry callbackPath="/dashboard/profile" />;
    signIn("discord", { redirectTo: "/dashboard/profile" });
  }
  if (!session) redirect("/");

  const khix = await getKhixHackathon();
  if (!khix) redirect("/apply");

  return (
    <KhixProfile
      sessionUser={{
        discordUserId: session.user.discordUserId,
        email: session.user.email,
        image: session.user.image,
        name: session.user.name,
      }}
    />
  );
}
