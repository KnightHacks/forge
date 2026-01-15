import { redirect } from "next/navigation";
import { ShieldPlus } from "lucide-react";

import { auth } from "@forge/auth";
import { Button } from "@forge/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@forge/ui/dialog";

import { SIGN_IN_PATH } from "~/consts";
import { api } from "~/trpc/server";
import RoleEdit from "./_components/roleedit";
import RoleTable from "./_components/roletable";

export default async function Roles() {
  const session = await auth();
  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  const hasAccess = await api.roles.hasPermission({
    or: ["CONFIGURE_ROLES"],
  });

  if (!hasAccess) {
    redirect("/");
  }

  return (
    <main className="container py-8">
      <header className="flex w-full flex-row justify-between rounded-lg border-b border-primary p-4">
        <h1 className="my-auto text-xl font-bold sm:text-3xl">
          Role Configuration
        </h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="my-auto flex flex-row gap-1">
              <ShieldPlus className="my-auto size-4" />
              <div className="my-auto hidden sm:block">Create New Role</div>
            </Button>
          </DialogTrigger>
          <DialogContent className="overflow-y-clip">
            <RoleEdit />
          </DialogContent>
        </Dialog>
      </header>
      <RoleTable />
    </main>
  );
}
