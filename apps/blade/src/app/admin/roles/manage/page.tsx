import RoleAssign from "./roleassign";

export default async function ManageRoles() {
    return(<main className="container py-8">
        <header className="flex flex-row justify-between w-full border-b rounded-lg p-4">
            <h1 className="text-3xl font-bold my-auto">Role Management (WIP)</h1>
        </header>
        <RoleAssign/>
    </main>)
}