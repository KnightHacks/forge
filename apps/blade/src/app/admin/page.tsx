import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@forge/auth";
import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Blade | Admin",
  description: "Manage Knight Hacks as an administrator.",
};

export default async function Admin() {
  const session = await auth();
  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  const isAdmin = await api.auth.getAdminStatus();
  if (!isAdmin) {
    redirect("/");
  }

  const user = await api.member.getMember();
  if (!user) {
    redirect("/");
  }

  return (
    <HydrateClient>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-96 flex-col items-center justify-center gap-4">
          <h1 className="mb-2 w-full break-words text-center text-3xl font-extrabold leading-tight tracking-tight sm:text-[3rem]">
            Hello, {user.firstName}
          </h1>
          <h1 className="mb-2 w-full break-words text-center text-3xl font-extrabold leading-tight tracking-tight sm:text-[3rem]">
            Let&apos;s get cooking.
          </h1>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Club</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-center gap-4">
                <Link href="/admin/club/members">
                  <Button>Members</Button>
                </Link>
                <Link href="/admin/club/events">
                  <Button>Events</Button>
                </Link>
                <Link href="/admin/club/data">
                  <Button>Data</Button>
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Hackathon</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-center gap-4">
                <Link href="/admin/hackathon/hackers">
                  <Button>Hackers</Button>
                </Link>
                <Link href="/admin/hackathon/data">
                  <Button>Data</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </HydrateClient>
  );
}