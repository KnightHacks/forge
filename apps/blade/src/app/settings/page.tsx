import { redirect } from "next/navigation";

import { auth } from "@forge/auth";
import { Separator } from "@forge/ui/separator";

import { api, HydrateClient } from "~/trpc/server";
import { MemberAppCard } from "../_components/option-cards";
import { MemberProfileForm } from "./member-profile-form";

export default async function SettingsProfilePage() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  const memberData = await api.member.getMember();

  return (
    <HydrateClient>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Member Profile</h3>
          <p className="text-sm text-muted-foreground">
            This is your member profile. Make changes to your account here.
          </p>
        </div>
        <Separator />
        {memberData ? (
          <MemberProfileForm data={memberData} />
        ) : (
          <div className="flex items-center justify-center">
            <MemberAppCard />
          </div>
        )}
      </div>
    </HydrateClient>
  );
}