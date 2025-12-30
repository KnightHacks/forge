"use client"

import { Checkbox } from "@forge/ui/checkbox"
import { Label } from "@forge/ui/label"
import { useState } from "react"

export default function RoleEdit()
{
    const dummy = [
        {
            name: "Read Members",
            desc: "Gives permission to read club members.",
            index: 0
        },
        {
            name: "Edit Members",
            desc: "Gives permission to edit member values, or to delete.",
            index: 1
        },
    ]

    const [roleID, setRoleID] = useState("")

    return(
        <div>
            <h1 className="text-2xl font-bold">Create/Edit Role</h1>
            <div className="flex flex-col">
                {dummy.map((v)=>(
                    <div className="flex flex-row gap-4 p-4 border-b hover:bg-muted/50 duration-100">
                        <Checkbox id={"perm"+v.index} className="my-auto"/>
                        <div className="flex flex-col gap-1">
                            <Label className="my-auto text-lg" htmlFor={"perm"+v.index}>{v.name}</Label>
                            <Label className="my-auto text-muted-foreground" htmlFor={"perm"+v.index}>{v.desc}</Label>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}