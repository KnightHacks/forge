import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth, signIn } from "~/auth/server";
import { getKhixHackathon } from "~/lib/khix-hackathon";
import { AuthRetry } from "../../_components/auth-retry";
import { KhixLore } from "../../_components/khix-dashboard";

export const metadata: Metadata = {
  title: "Knight Hacks IX | Lore",
  description:
    "Enter the Knight Hacks IX lore and follow the aftermath of T.K., Lenny, and the shattered gem.",
};

export default async function LorePage({
  searchParams,
}: {
  searchParams: Promise<{ authError?: string }>;
}) {
  const session = await auth();
  const { authError } = await searchParams;
  if (!session) {
    if (authError) return <AuthRetry callbackPath="/dashboard/lore" />;
    signIn("discord", { redirectTo: "/dashboard/lore" });
  }
  if (!session) redirect("/");

  const khix = await getKhixHackathon();
  if (!khix) redirect("/apply");

  return (
    <KhixLore
      sessionUser={{
        discordUserId: session.user.discordUserId,
        email: session.user.email,
        image: session.user.image,
        name: session.user.name,
      }}
    />
  );
}
