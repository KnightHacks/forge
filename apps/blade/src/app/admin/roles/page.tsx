import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { SIGN_IN_PATH } from "~/consts";
import { api } from "~/trpc/server";
import { ChevronDown, Copy, Edit, Plus, User } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@forge/ui/table";
import { Button } from "@forge/ui/button";
import RoleTable from "./_components/roletable";
import { Dialog, DialogContent, DialogTrigger } from "@forge/ui/dialog";
import RoleEdit from "./_components/roleedit";

export default async function Roles() {
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

    const dummy = [
        {
            roleName: "Officer",
            roleID: "1246637685011906560",
            permissions: [1,2,4,8],
            members: ["237327", "2659099"]
        },
        {
            roleName: "Officer",
            roleID: "1246637685011906560",
            permissions: [1,2,4,8],
            members: ["237327", "2659099"]
        }
    ]

    return (
        <main className="container py-8">
            <header className="flex flex-row justify-between w-full border-b rounded-lg p-4">
                <h1 className="text-3xl font-bold my-auto">Role Manager</h1>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button className="my-auto">
                            <Plus/>
                            Add Role
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <RoleEdit/>
                    </DialogContent>
                </Dialog>
                
            </header>
            <RoleTable/>
        </main>
    )
}