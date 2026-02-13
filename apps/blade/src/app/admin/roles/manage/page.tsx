import { redirect } from "next/navigation";

import { api } from "~/trpc/server";
import RoleAssign from "./roleassign";

export default async function ManageRoles() {
  const hasAccess = await api.roles.hasPermission({
    or: ["ASSIGN_ROLES"],
  });
  if (!hasAccess) {
    redirect("/");
  }
  return (
    <main className="container py-8">
      <header className="flex w-full flex-row justify-between rounded-lg border-b border-primary p-4">
        <h1 className="my-auto text-xl font-bold sm:text-3xl">
          Role Management
        </h1>
      </header>
      <RoleAssign />
    </main>
  );
}
