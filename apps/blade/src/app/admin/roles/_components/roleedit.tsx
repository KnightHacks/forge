"use client"

import { PERMISSION_DATA } from "@forge/consts/knight-hacks";
import { Button } from "@forge/ui/button";
import { Checkbox } from "@forge/ui/checkbox";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import type { APIRole } from "discord-api-types/v10";
import { Link, Loader2, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "~/trpc/react";

export default function RoleEdit()
{
    const dummy = [
        {
            name: "Read Members",
            desc: "Gives permission to read club members."
        },
        {
            name: "Edit Members",
            desc: "Gives permission to edit member values, or to delete."
        },
        {
            name: "Edit Members",
            desc: "Gives permission to edit member values, or to delete."
        },
        {
            name: "Edit Members",
            desc: "Gives permission to edit member values, or to delete."
        },
        {
            name: "Edit Members",
            desc: "Gives permission to edit member values, or to delete."
        },
        {
            name: "Edit Members",
            desc: "Gives permission to edit member values, or to delete."
        },
        {
            name: "Edit Members",
            desc: "Gives permission to edit member values, or to delete."
        },
        {
            name: "Edit Members",
            desc: "Gives permission to edit member values, or to delete."
        },
        {
            name: "Edit Members",
            desc: "Gives permission to edit member values, or to delete."
        },
        {
            name: "Edit Members",
            desc: "Gives permission to edit member values, or to delete."
        },
        {
            name: "Edit Members",
            desc: "Gives permission to edit member values, or to delete."
        },
        {
            name: "Edit Members",
            desc: "Gives permission to edit member values, or to delete."
        },
        {
            name: "Edit Members",
            desc: "Gives permission to edit member values, or to delete."
        },
    ]

    const [roleID, setRoleID] = useState("")
    const [role, setRole] = useState<APIRole | null>()
    const [loadingRole, setLoadingRole] = useState(false)

    const roleQ = api.auth.getDiscordRole.useQuery({roleId:roleID}, {
        enabled: true,
        retry: false
    })

    const {data: roleCounts} = api.auth.getDiscordRoleCounts.useQuery()

    useEffect(()=>{
        async function doGetRole() {
            setLoadingRole(true)
            setRole((await roleQ.refetch()).data)
            setLoadingRole(false)
        }

        void doGetRole()
    },[roleID])

    return(
        <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold mb-2">Link/Edit Role</h2>
            <div className="flex flex-col gap-2">
                <Label htmlFor="roleId">Discord Role ID</Label>
                <Input value={roleID} onChange={(e)=>setRoleID(e.target.value)} id="roleId" placeholder="ex. 1151884200069320805" className="col-span-2"/>
            </div>
            {loadingRole ? 
            <div className="flex flex-col gap-2">
                <div className="text-sm font-medium text-muted-foreground">The following role will be linked:</div>
                <Loader2 className="animate-spin size-6 text-muted-foreground"/>
            </div> :
            role ? 
            <div className="flex flex-col gap-2">
                <div className="text-sm font-medium text-muted-foreground">The following role will be linked:</div>
                <div className="grid grid-cols-4 border-y p-2 rounded-lg">
                    <div className="col-span-3">
                        <div className="border rounded-full py-1 px-2 w-fit max-w-full flex flex-row gap-1 my-auto" style={{borderColor: `#${role.color.toString(16)}`}}>
                            <div className="size-3 mr-1 rounded-full my-auto" style={{backgroundColor: `#${role.color.toString(16)}`}}/>
                            <div className="text-sm font-medium truncate">{role.name}</div>
                        </div>
                    </div>
                    <div className="my-auto text-sm font-medium w-full justify-end flex flex-row">
                        <div className="flex flex-row rounded-lg border p-1 gap-1">
                            <User className="size-5"/>
                            {roleCounts ? <div>{roleCounts[role.id] ?? 0}</div> : <Loader2 className="animate-spin"/>}
                        </div>
                    </div>
                </div>
            </div>
            :
            <div className="flex flex-row gap-1">
                <X className="text-red-700 size-4 my-auto"/>
                <div className="text-red-700 text-sm font-medium my-auto">Could not find a Discord role with this ID.</div>
            </div>
            }
            <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">Permissions</h3>
                <div className="flex flex-col border rounded-lg overflow-y-scroll max-h-[40vh]">
                    {dummy.map((v,i)=>(
                        <div className="flex flex-row gap-4 p-3 border-b hover:bg-muted/50 duration-100">
                            <Checkbox id={"perm"+i} className="my-auto"/>
                            <Label htmlFor={"perm"+i} className="flex flex-col gap-1">
                                <div className="my-auto">{v.name}</div>
                                <div className="my-auto text-sm text-muted-foreground">{v.desc}</div>
                            </Label>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex flex-row justify-between">
                <div className="my-auto text-sm font-medium">5 Permissions</div>
                <Button disabled={(!role) || loadingRole} className="my-auto flex flex-row gap-1">
                    <Link className="size-4 my-auto"/>
                    Create Link
                </Button>
            </div>
        </div>
    )
}