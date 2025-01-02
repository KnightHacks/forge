import { redirect } from "next/navigation";

import { auth } from "@forge/auth";
import { Separator } from "@forge/ui/separator";

import { api, HydrateClient } from "~/trpc/server";
import { MemberProfileForm, NoMember } from "./member-profile-form";

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
        {memberData ? <MemberProfileForm data={memberData} /> : <NoMember />}
      </div>
    </HydrateClient>
  );
}
