"use client"

import { Checkbox } from "@forge/ui/checkbox"
import { Input } from "@forge/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@forge/ui/table"
import { toast } from "@forge/ui/toast"
import { Check, Copy, Loader2, Search } from "lucide-react"
import { useState } from "react"
import { api } from "~/trpc/react"

export default function RoleAssign() {

    const {data: users, status} = api.user.getUsers.useQuery()
    const {data: roles} = api.roles.getAllLinks.useQuery()

    const [copyConfirm, setCopyConfirm] = useState(-1)
    const [searchTerm, setSearchTerm] = useState("")

    const filteredUsers = (users ?? []).filter((user) =>
        Object.values(user).some((value) => {
        if (value === null) return false;
        return value.toString().toLowerCase().includes(searchTerm.toLowerCase());
        }),
    );

    return(
        <div className="mt-8 w-full flex flex-col gap-4 md:grid md:grid-cols-4">
            <div className="flex flex-col gap-2 w-full col-span-3">
                <div className="relative w-full">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                    />
                </div>
                {status == "pending" ?
                <Loader2 className="mx-auto mt-4 animate-spin"/>
                : !users ? 
                <div className="mx-auto mt-8 text-lg font-medium">Failed to get users.</div>
                : filteredUsers.length == 0 ?
                <div className="mx-auto mt-8 text-lg font-medium">Could not find any users matching this search.</div> :
                <Table>
                    <TableHeader className="w-full text-left">
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Discord ID</TableHead>
                            <TableHead>Roles</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.map((v, i)=>{
                            return(<TableRow className={`${i%2 == 1 && "bg-muted/20"}`}>
                                <TableCell className="text-base font-semibold flex flex-row gap-4">
                                    <label className="my-auto">{v.name}</label>
                                </TableCell>
                                <TableCell>
                                    <div tabIndex={0} onClick={()=>{void navigator.clipboard.writeText(v.discordUserId); setCopyConfirm(i); toast(`Copied "${v.discordUserId}" to clipboard!`)}} 
                                    className={`text-muted-foreground ${copyConfirm == i && "bg-muted border-muted-foreground"} hover:bg-muted hover:text-white hover:border-white border rounded-full cursor-pointer py-1 px-2 w-fit flex flex-row gap-1`}>
                                        {copyConfirm == i ? <Check className="size-4 my-auto"/> : <Copy className="size-4 my-auto"/>}
                                        <div className="ml-1 truncate font-mono">{`${v.discordUserId}`}</div>
                                    </div>
                                </TableCell>
                                <TableCell className="flex flex-col gap-1">
                                    {v.permissions.map((p)=>{
                                        return(<div>{p.roleId}</div>)
                                    })}
                                </TableCell>
                            </TableRow>)
                        })}
                    </TableBody>
                </Table>}
            </div>
            <div className="flex flex-col gap-2 rounded-lg border-l pl-2">
                <h2 className="text-lg font-bold py-1 px-2 border-b">Roles</h2>
                <ul className="flex flex-col gap-2 px-2 font-medium">
                {
                    !roles ?
                    <Loader2 className="mx-auto mt-4 animate-spin"/> :
                    roles.map((v)=>{
                        return(<li>
                            {v.name}
                        </li>)
                    })
                }
                </ul>
            </div>
        </div>)
}