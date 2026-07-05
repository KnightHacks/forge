import type { Metadata } from "next";

import { auth, signIn } from "~/auth/server";
import { AuthRetry } from "../../_components/auth-retry";
import { HackerProfileForm } from "../../_components/hacker-profile-form";

export const metadata: Metadata = {
  title: "BloomKnights | Hacker Profile",
};

export default async function HackerProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ authError?: string }>;
}) {
  const session = await auth();
  const { authError } = await searchParams;
  if (!session) {
    if (authError) {
      return <AuthRetry callbackPath="/dashboard/profile" withShell={false} />;
    }
    signIn("discord", { redirectTo: "/dashboard/profile" });
  }

  return (
    <section className="bk-portal-panel bk-dashboard-panel bk-profile-panel w-full text-[#3d2e1e]">
      <div className="border-b border-[#c4a882]/30 bg-[#daeaf5]/35 p-4 sm:p-8">
        <p className="bk-portal-kicker">Profile</p>
        <h1 className="bk-portal-heading mt-2 text-2xl leading-tight sm:text-4xl">
          Your information
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#5a4535]">
          Keep the details attached to your BloomKnights application current.
          Required fields are marked with an asterisk.
        </p>
      </div>
      <div className="p-4 sm:p-8">
        <HackerProfileForm />
      </div>
    </section>
  );
}
