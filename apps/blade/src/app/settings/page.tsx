import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@forge/auth";
import { Separator } from "@forge/ui/separator";

import { MemberProfileForm } from "~/app/_components/settings/member-profile-form";
import { api, HydrateClient } from "~/trpc/server";

export default async function SettingsProfilePage() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  const memberData = await api.member.getMember();

  if (!memberData) {
    const hackerData = await api.hacker.getHacker({});
    if (hackerData) {
      redirect("/settings/hacker-profile");
    }

    return (
      <div className="mx-auto flex w-full flex-col items-center justify-center px-4 py-16 text-center">
        <div className="relative mb-6 h-[300px] w-[300px]">
          <Image
            src="/tech-knight-sword.png"
            alt="Illustration of TK holding a sword"
            fill
            style={{ objectFit: "contain" }}
            priority
            sizes="100%"
          />
        </div>
        <h2 className="mb-2 text-xl font-medium text-gray-100">
          Nothing to see yet
        </h2>
        <p className="mb-1 text-sm text-gray-400">
          You haven&apos;t applied to be a Knight Hacks member yet.
        </p>
        <p className="mb-1 text-sm text-gray-400">
          Please fill out a{" "}
          <Link
            href="/member/application"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            Member Application
          </Link>{" "}
          to join our annual programs, like Kickstart Mentorship and Project
          Launch!
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 lg:max-w-2xl">
      <HydrateClient>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">Member Profile</h3>
            <p className="text-sm text-muted-foreground">
              This is your member profile. Make changes to your account here.
            </p>
          </div>
          <Separator />
          <MemberProfileForm data={memberData} />
        </div>
      </HydrateClient>
    </div>
  );
}
