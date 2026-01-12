"use client"

import { Loader2 } from "lucide-react"
import { api } from "~/trpc/react"

export default function RoleAssign() {

    const {data: users, status} = api.user.getUsers.useQuery()

    return(
        <div className="mt-4 w-full">
            <div className="flex flex-col gap-2">
                {status == "pending" ?
                <Loader2 className="mx-auto mt-4 animate-spin"/>
                : !users ? 
                <div>Failed to get users</div>
                : users.map((v)=>{
                    return(<div>
                        <div>{v.name}</div>
                        <div className="flex flex-col gap-1">
                            {v.permissions.map((p)=>{
                                return(<div>{p.roleId}</div>)
                            })}
                        </div>
                    </div>)
                })}
            </div>
        </div>)
}