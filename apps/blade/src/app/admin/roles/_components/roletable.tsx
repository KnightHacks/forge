/* eslint-disable @typescript-eslint/no-unnecessary-condition */
"use client"

import { getPermsAsList } from "../../../../lib/utils";
import { Button } from "@forge/ui/button"
import { Dialog, DialogContent, DialogTrigger } from "@forge/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@forge/ui/dropdown-menu"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@forge/ui/table"
import { toast } from "@forge/ui/toast"
import { Copy, User, ChevronDown, Edit, Trash, X, Loader2 } from "lucide-react"
import { api } from "~/trpc/react";
import type { APIRole } from "discord-api-types/v10";
import RoleEdit from "./roleedit";
import { useEffect, useState } from "react";

export default function RoleTable()
{
    const {data: roles} = api.roles.getAllLinks.useQuery()
    const discordRolesQ = api.roles.getDiscordRoles.useQuery({roles: roles}, {enabled: false, retry: false})
    const {data: roleCounts} = api.roles.getDiscordRoleCounts.useQuery()
    const deleteLinkMutation = api.roles.deleteRoleLink.useMutation()

    const [discordRoles, setDiscordRoles] = useState<(APIRole | null)[] | undefined>()

    useEffect(()=>{
        async function fetchDiscordRoles() {
            setDiscordRoles((await discordRolesQ.refetch()).data)
        }

        if(roles) void fetchDiscordRoles()
    },[roles])

    function deleteRole(id:string) {
        try {
            deleteLinkMutation.mutate({id:id})
            location.reload()
        } catch (error) {
            toast((error as Error).message)
        }
    }

    return(
        !roles ? 
        <Loader2 className="animate-spin mt-16 size-12 mx-auto"/>
        :
        roles.length == 0 ?
        <div className="font-medium mt-16 text-muted-foreground w-full text-center">There are currently no roles linked.</div>
        :
        <Table className="w-full rounded-lg mt-4">
            <TableHeader className="w-full text-left">
                <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Discord ID</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead className="text-center">Edit</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody className="">
                {
                    roles.map((v, i)=>{
                        const role = discordRoles?.at(i)
                        return (
                        <TableRow id={"role"+i} className="">
                            <TableCell>
                                {
                                    // the linter is just wrong, this value can absolutely be pending
                                    discordRolesQ.status as ("error" | "success" | "pending") == "pending" ?
                                    <Loader2 className="animate-spin my-auto"/>
                                    : role ? 
                                    <div className="border rounded-full py-1 px-2 w-fit flex flex-row gap-1" style={{borderColor: `#${role.color.toString(16)}`}}>
                                        <div className="size-3 mr-1 rounded-full my-auto" style={{backgroundColor: `#${role.color.toString(16)}`}}/>
                                        <div className="truncate font-medium">{role.name}</div>
                                    </div>
                                    :
                                    <div className="flex flex-row gap-1 text-red-700 ">
                                        <X className="my-auto"/> 
                                        <div className="font-medium my-auto">Not Found</div>
                                    </div>
                                }
                            </TableCell>
                            <TableCell>
                                <div tabIndex={0} onClick={()=>{void navigator.clipboard.writeText(v.discordRoleId); toast(`Copied "${v.discordRoleId}" to clipboard!`)}} className="text-muted-foreground hover:bg-muted hover:text-white hover:border-white border rounded-full cursor-pointer py-1 px-2 w-fit flex flex-row gap-1">
                                    <Copy className="size-4 my-auto"/>
                                    <div className="ml-1 truncate font-mono">{`${v.discordRoleId}`}</div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger>
                                        <div className="border rounded-lg hover:bg-muted flex flex-row gap-1 w-fit px-2 py-1">
                                            {getPermsAsList(v.permissions).length}
                                            <ChevronDown className="size-4 my-auto"/>
                                        </div>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="p-2">
                                        <h3 className="text-sm font-medium border-b p-1 pb-2">This role has the following permissions:</h3>
                                        <ul className="list-disc px-4 max-h-48 overflow-y-auto mt-1">
                                        {getPermsAsList(v.permissions).map((p) => {
                                            return<li className={`p-1 text-sm text-muted-foreground`}>{p}</li>
                                        })}
                                        </ul>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                            <TableCell >
                                {roleCounts ?
                                    <div className="flex flex-row gap-1 w-fit p-2">
                                        <User className="size-5 my-auto"/>
                                        {roleCounts[v.discordRoleId] ?? 0}
                                    </div>
                                    :
                                    <Loader2 className="animate-spin my-auto"/>
                                }
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-row gap-2 justify-center">
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button className="p-2">
                                                <Edit/>
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="overflow-y-clip">
                                            <RoleEdit oldRole={v}/>
                                        </DialogContent>
                                    </Dialog>
                                    <Button className="p-2 bg-red-700 hover:bg-red-900" onClick={()=>deleteRole(v.id)}>
                                        <Trash/>
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>)                     
                    })                   
                }
            </TableBody>
        </Table>
        
    )
}