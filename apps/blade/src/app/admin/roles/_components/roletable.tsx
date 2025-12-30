"use client"

import { Button } from "@forge/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@forge/ui/dropdown-menu"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@forge/ui/table"
import { toast } from "@forge/ui/toast"
import { Copy, User, ChevronDown, Edit, Trash, X, Loader2 } from "lucide-react"
import { api } from "~/trpc/react";

export default function RoleTable()
{
    const dummy = [
        {
            roleID: "1246637685011906560",
            permissions: "110011000000"
        },
        {
            roleID: "1151884200069320805",
            permissions: "110100000000"
        },
        {
            roleID: "1420819295759237222",
            permissions: "110011001100"
        },
        {
            roleID: "1246637685011906561",
            permissions: "000011000000"
        }
    ]

    const {data: roleCounts} = api.auth.getDiscordRoleCounts.useQuery()

    function countPerms(perms:string) {
        let sum = 0
        for (const c of perms)
            if (c == "1")
                sum += 1

        return sum
    }

    return(
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
                    dummy.map((v, i)=>{
                        const {data:role, status} = api.auth.getDiscordRole.useQuery({roleId:v.roleID}, {retry: false})
                        return (
                        <TableRow id={"role"+i} className="">
                            <TableCell>
                                {
                                    status == "pending" ?
                                    <Loader2 className="animate-spin my-auto"/>
                                    : role ? 
                                    <div className="border rounded-full py-2 px-4 w-fit flex flex-row gap-1" style={{borderColor: `#${role.color.toString(16)}`}}>
                                        <div className="size-3 mr-1 rounded-full my-auto" style={{backgroundColor: `#${role.color.toString(16)}`}}/>
                                        <div className="truncate">{role.name}</div>
                                    </div>
                                    :
                                    <div className="flex flex-row gap-1 text-red-700 ">
                                        <X className="my-auto"/> 
                                        <div className="font-medium my-auto">Not Found</div>
                                    </div>
                                }
                            </TableCell>
                            <TableCell>
                                <div tabIndex={0} onClick={()=>{navigator.clipboard.writeText(v.roleID);toast(`Copied "${v.roleID}" to clipboard!`)}} className="text-muted-foreground hover:bg-muted hover:text-white hover:border-white border rounded-full cursor-pointer py-2 px-4 w-fit flex flex-row gap-1">
                                    <Copy className="size-4 my-auto"/>
                                    <div className="ml-1 truncate">{`${v.roleID}`}</div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger>
                                        <div className="border rounded-lg hover:bg-muted flex flex-row gap-1 w-fit p-2">
                                            {countPerms(v.permissions)}
                                            <ChevronDown className="size-4 my-auto"/>
                                        </div>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="p-2">
                                        {v.permissions.split("").map((e) => {
                                            if(e == "1")
                                                return<div className={`border-b p-1`}>Read Members</div>
                                            else
                                                return <div/>
                                        })}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                            <TableCell >
                                {roleCounts ?
                                    <div className="flex flex-row gap-1 w-fit p-2">
                                        <User className="size-5 my-auto"/>
                                        {roleCounts[v.roleID] ?? 0}
                                    </div>
                                    :
                                    <Loader2 className="animate-spin my-auto"/>
                                }
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-row gap-2 justify-center">
                                    <Button className="p-2">
                                        <Edit/>
                                    </Button>
                                    <Button className="p-2 bg-red-700">
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