import RoleAssign from "./roleassign";

export default function ManageRoles() {
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
