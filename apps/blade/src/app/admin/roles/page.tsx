import { redirect } from "next/navigation";

import { auth } from "@forge/auth";

import { SIGN_IN_PATH } from "~/consts";
import { api } from "~/trpc/server";
import { ChevronDown, Edit, Plus, User } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@forge/ui/table";
import { Button } from "@forge/ui/button";

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
                <Button className="my-auto">
                    <Plus/>
                    Add Role
                </Button>
            </header>
            <Table className="w-full rounded-lg mt-4">
                <TableHeader className="w-full text-left">
                    <TableRow>
                        <TableHead>Role Name</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>Permissions</TableHead>
                        <TableHead>Edit</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody className="">
                    {
                        dummy.map((v)=>(
                            <TableRow className="">
                                <TableCell>
                                    <div className="border rounded-full py-2 px-4 w-fit flex flex-row gap-1">
                                        <div className="size-3 rounded-full bg-green-700 my-auto"/>
                                        <div>{v.roleName}</div>
                                        <div className="text-muted-foreground ml-1">{`ID: ${v.roleID}`}</div>
                                    </div>
                                </TableCell>
                                <TableCell >
                                    <div className="flex flex-row gap-1 underline w-fit">
                                        <User/>
                                        {v.members.length}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="border rounded-lg flex flex-row gap-1 w-fit p-2">
                                        {v.permissions.length}
                                        <ChevronDown className="size-4 my-auto"/>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Button className="p-2">
                                        <Edit/>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    }
                </TableBody>
            </Table>
        </main>
    )
}