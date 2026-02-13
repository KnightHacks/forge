import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";
import MemberTable from "./_components/members-table";
import ScannerPopUp from "./_components/scanner";

export default async function Members() {
  // authentication
  const session = await auth();
  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  const hasAccess = await api.roles.hasPermission({
    or: ["EDIT_MEMBERS", "READ_MEMBERS"],
  });
  if (!hasAccess) {
    redirect("/");
  }
  return (
    <HydrateClient>
      <main className="container h-screen">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="py-12">
            <h1 className="pb-4 text-center text-3xl font-extrabold tracking-tight sm:text-5xl">
              Member Dashboard
            </h1>
            <div className="mb-2 flex justify-center">
              <ScannerPopUp eventType="Member" />
            </div>
          </div>
        </div>
        <div className="rounded-xl pb-8">
          <MemberTable />
        </div>
      </main>
    </HydrateClient>
  );
}
