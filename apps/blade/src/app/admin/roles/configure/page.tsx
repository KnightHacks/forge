import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { SIGN_IN_PATH } from "~/consts";
import { api } from "~/trpc/server";
import { Link, ShieldPlus } from "lucide-react";
import { Button } from "@forge/ui/button";
import RoleTable from "./_components/roletable";
import { Dialog, DialogContent, DialogTrigger } from "@forge/ui/dialog";
import RoleEdit from "./_components/roleedit";

export default async function Roles() {
    const session = await auth();
    if (!session) {
        redirect(SIGN_IN_PATH);
    }

    const isOfficer = await api.roles.hasPermission({and:["IS_OFFICER"]})
    if (!isOfficer) {
        redirect("/");
    }

    return (
        <main className="container py-8">
            <header className="flex flex-row justify-between w-full border-b rounded-lg p-4">
                <h1 className="text-3xl font-bold my-auto">Role Configuration</h1>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button className="my-auto flex flex-row gap-1">
                            <ShieldPlus className="size-4 my-auto"/>
                            Create New Role
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="overflow-y-clip">
                        <RoleEdit/>
                    </DialogContent>
                </Dialog>
            </header>
            <RoleTable/>
        </main>
    )
}