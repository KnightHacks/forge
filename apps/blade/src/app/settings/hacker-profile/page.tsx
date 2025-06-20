import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@forge/auth";
import { Separator } from "@forge/ui/separator";

import { api, HydrateClient } from "~/trpc/server";
import { HackerProfileForm } from "./hacker-profile-form";

export default async function SettingsProfilePage() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  const hackerData = await api.hacker.getHacker({});

  if (!hackerData) {
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
          Hacker Applications are not available yet. Please check back later.
        </p>
        <p className="text-sm text-gray-400">
          Looking for your member profile instead? Check the{" "}
          <Link href="/settings" className="text-primary hover:underline">
            member profile
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 lg:max-w-2xl">
      <HydrateClient>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">Hacker Profile</h3>
            <p className="text-sm text-muted-foreground">
              This is your hacker profile. Make changes to your account here.
            </p>
          </div>
          <Separator />
          <HackerProfileForm data={hackerData} />
        </div>
      </HydrateClient>
    </div>
  );
}
