import { PERMISSION_DATA, PermissionKey } from "@forge/consts/knight-hacks";
import { Card, CardContent } from "@forge/ui/card";
import { ShieldX, X } from "lucide-react";

export function BadPerms({perms}:{perms:PermissionKey[]}) {

    const permNames:string[] = []
    perms.forEach((v)=>{
        permNames.push(PERMISSION_DATA[v].name)
    })

    return (
        <div className="text-center flex flex-col gap-2 max-w-fit bg-red-700/10 border-red-700 border p-8 mx-auto rounded-lg">
            <div className="size-12 rounded-full bg-red-700 flex mx-auto shadow-sm">
                <ShieldX className="mx-auto my-auto"/>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">Access Denied</h2>
            <div className="text-sm">This action requires the following permissions:</div>
            <div className="font-semibold">{permNames.join(", ")}</div>
        </div>
    )
}