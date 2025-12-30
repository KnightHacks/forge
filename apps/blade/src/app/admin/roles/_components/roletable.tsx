"use client"

import { Button } from "@forge/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@forge/ui/dropdown-menu"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@forge/ui/table"
import { toast } from "@forge/ui/toast"
import { Copy, User, ChevronDown, Edit } from "lucide-react"
import { discord } from "@forge/api/utils"

export default function RoleTable()
{
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

    return(
        <Table className="w-full rounded-lg mt-4">
            <TableHeader className="w-full text-left">
                <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Discord ID</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Edit</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody className="">
                {
                    dummy.map((v)=>(
                        <TableRow className="">
                            <TableCell>
                                <div className="border border-green-700 rounded-full py-2 px-4 w-fit flex flex-row gap-1">
                                    <div className="size-3 mr-1 rounded-full bg-green-700 my-auto"/>
                                    <div>{v.roleName}</div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div tabIndex={0} onClick={()=>{navigator.clipboard.writeText(v.roleID);toast(`Copied "${v.roleName}" Discord ID to clipboard!`)}} className="text-muted-foreground hover:text-white hover:border-white border rounded-full cursor-pointer py-2 px-4 w-fit flex flex-row gap-1">
                                    <Copy className="size-4 my-auto"/>
                                    <div className="ml-1">{`${v.roleID}`}</div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger>
                                        <div className="border rounded-lg hover:bg-muted flex flex-row gap-1 w-fit p-2">
                                            {v.permissions.length}
                                            <ChevronDown className="size-4 my-auto"/>
                                        </div>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        {v.permissions.map((v)=>(
                                            <div>{v}</div>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                            <TableCell > 
                                <DropdownMenu>
                                    <DropdownMenuTrigger>
                                        <div className="border hover:bg-muted rounded-lg flex flex-row gap-1 w-fit p-2">
                                        <User className="size-5 my-auto"/>
                                        {v.members.length}
                                        <ChevronDown className="ml-1 size-4 my-auto"/>
                                    </div>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        {v.members.map((v)=>(
                                            <div>{v}</div>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
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
    )
}