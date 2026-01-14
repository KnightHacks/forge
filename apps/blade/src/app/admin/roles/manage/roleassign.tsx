"use client"

import { ResetIcon } from "@forge/ui"
import { Button } from "@forge/ui/button"
import { Checkbox } from "@forge/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@forge/ui/dropdown-menu"
import { Input } from "@forge/ui/input"
import { Label } from "@forge/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@forge/ui/table"
import { toast } from "@forge/ui/toast"
import { Check, ChevronDown, Copy, Filter, Loader2, Search, ShieldOff, ShieldPlus, User, UserCheck } from "lucide-react"
import { useEffect, useState } from "react"
import { api } from "~/trpc/react"

export default function RoleAssign() {

    const {data: users, status} = api.user.getUsers.useQuery()
    const {data: roles} = api.roles.getAllLinks.useQuery()

    const batchQ = api.roles.batchManagePermission.useMutation()

    const mappedRoles:Record<string, {name: string, permissions: string, discordRoleId: string}> = {}

    roles?.forEach((v) => {
        mappedRoles[v.id] = {name: v.name, discordRoleId: v.discordRoleId, permissions: v.permissions}
    })

    const [copyConfirm, setCopyConfirm] = useState(-1)
    const [searchTerm, setSearchTerm] = useState("")

    // weird hack to force the DOM to update
    const [upd, sUpd] = useState(false)

    const [checkedUsers, setCheckedUsers] = useState<Record<string, boolean>>({}); // stores userIds
    const [checkedRoles, _setCheckedRoles] = useState<Record<string, boolean>>({}); // stores roleIds
    // all checked roles will be applied to all checked users

    const [filterRoles, _setFilterRoles] = useState<Record<string, boolean>>({});

    const [countedUsers, setCountedUsers] = useState(0)

    useEffect(() => {
        let sum = 0
        Object.entries(checkedUsers).forEach((v)=>{
            if(v[1]) sum++
        })
        setCountedUsers(sum)
    },[checkedUsers, upd])
    
    const filteredUsers = (users ?? []).filter((user) =>
        Object.values(filterRoles).includes(true) && !user.permissions.find((v)=>filterRoles[v.roleId]) ? false :
        Object.values(user).some((value) => {
        if (value === null) return false;
        return value.toString().toLowerCase().includes(searchTerm.toLowerCase());
        }),
    )

    const sendBatchRequest = async (users:typeof checkedUsers, roles:typeof checkedRoles, revoking: boolean) => {
        const finalUsers = Object.entries(users).map((v)=>{if(v[1]) return v[0]}).filter((v)=>v!=undefined)
        const finalRoles = Object.entries(roles).map((v)=>{if(v[1]) return v[0]}).filter((v)=>v!=undefined)

        await batchQ.mutate({roleIds: finalRoles, userIds: finalUsers, revoking})
        location.reload()
    }

    return(
        <div className="mt-8 w-full flex flex-col gap-4 md:grid md:grid-cols-4">
            <div className="flex flex-col gap-4 w-full col-span-3">
                <div className="flex flex-row gap-2">
                    <div className="relative w-full">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                        />
                    </div>
                    <div tabIndex={0} title="Reset Checked Users" onClick={()=>setCheckedUsers({})} className="flex hover:bg-muted h-full flex-row gap-1 px-2 py-1 border rounded-lg my-auto cursor-pointer">
                        <UserCheck className="size-5 my-auto"/>
                        <div className="my-auto">{countedUsers}</div>
                        <ResetIcon className="size-4 my-auto"/>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger>
                            <div tabIndex={0} title="Filter by Role" className="border rounded-lg hover:bg-muted flex flex-row gap-1 w-fit h-full px-2 py-1">
                                <Filter className="size-5 my-auto"/>
                                <ChevronDown className="size-4 my-auto"/>
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="p-4">
                            <div className="border-b text-muted-foreground text-small pb-2">Select roles to filter by:</div>
                            <ul className="flex flex-col gap-4 p-2 pl-0 font-medium pt-4">
                            {
                                !roles ?
                                <Loader2 className="mx-auto mt-4 animate-spin"/> :
                                roles.map((v, i)=>{
                                    return(<li className="flex flex-row gap-3">
                                        <Checkbox id={"role-f_"+i} checked={filterRoles[v.id] ?? false} onCheckedChange={(c)=>{filterRoles[v.id] = (c == true); sUpd(!upd)}}/>
                                        <Label htmlFor={"role-f_"+i} className="my-auto text-base cursor-pointer">{v.name}</Label>
                                    </li>)
                                })
                            }
                            </ul>
                        </DropdownMenuContent>
                    </DropdownMenu>
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
                    <TableBody className="overflow-y-scroll max-h-[50vh]">
                        {filteredUsers.map((v, i)=>{
                            return(<TableRow className={`${i%2 == 1 && "bg-muted/20"}`}>
                                <TableCell className="text-base font-semibold flex flex-row gap-4">
                                    <Checkbox id={"user_"+i} checked={checkedUsers[v.id] ?? false} onCheckedChange={(c)=>{checkedUsers[v.id] = (c == true); sUpd(!upd)}}/>
                                    <Label htmlFor={"user_"+i} className="my-auto cursor-pointer py-2">{v.name}</Label>
                                </TableCell>
                                <TableCell>
                                    <div tabIndex={0} onClick={()=>{void navigator.clipboard.writeText(v.discordUserId); setCopyConfirm(i); toast(`Copied "${v.discordUserId}" to clipboard!`)}} 
                                    className={`text-muted-foreground ${copyConfirm == i && "bg-muted border-muted-foreground"} hover:bg-muted hover:text-white hover:border-white border rounded-full cursor-pointer py-1 px-2 w-fit flex flex-row gap-1`}>
                                        {copyConfirm == i ? <Check className="size-4 my-auto"/> : <Copy className="size-4 my-auto"/>}
                                        <div className="ml-1 truncate font-mono">{`${v.discordUserId}`}</div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {v.permissions.length == 0 ? "" :
                                    v.permissions.length == 1 ? mappedRoles[v.permissions.at(0)?.roleId || ""]?.name ?? "?" :
                                    <DropdownMenu>
                                        <DropdownMenuTrigger>
                                            <div tabIndex={0} className="border rounded-lg hover:bg-muted flex flex-row gap-1 w-fit px-2 py-1">
                                                {v.permissions.length}
                                                <ChevronDown className="size-4 my-auto"/>
                                            </div>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="p-2">
                                            <h3 className="text-sm font-medium border-b p-1 pb-2">This user has the following roles:</h3>
                                            <ul className="list-disc px-4 max-h-48 overflow-y-auto mt-1">
                                            {v.permissions.map((p) => {
                                                return<li className={`p-1 text-sm text-muted-foreground`}>{mappedRoles[p.roleId]?.name ?? ""}</li>
                                            })}
                                            </ul>
                                        </DropdownMenuContent>
                                    </DropdownMenu>}
                                </TableCell>
                            </TableRow>)
                        })}
                    </TableBody>
                </Table>}
            </div>
            <div className="flex flex-col gap-4 rounded-lg border-primary h-fit py-2 pl-0 border-t pt-4 sm:pl-2 sm:pt-2 sm:border-l sm:border-t-0">
                <div className="flex flex-row gap-2 w-full">
                    <div className="w-full font-semibold text-xl pl-2 mt-auto w-full">Controls</div>
                    <Button className="ml-1 p-1 px-2 size-8" title="Grant Selected Roles to Users"
                    onClick={()=>sendBatchRequest(checkedUsers, checkedRoles, false)}><ShieldPlus className="size-4"/></Button>
                    <Button className="p-1 px-2 size-8 bg-red-700" title="Revoke Selected Roles from Users"
                    onClick={()=>sendBatchRequest(checkedUsers, checkedRoles, true)}><ShieldOff className="size-4"/></Button>
                </div>
                
                <div className="flex flex-col gap-2 h-fit">
                    <ul className="flex flex-col gap-4 p-2 font-medium border-t pt-4">
                    {
                        !roles ?
                        <Loader2 className="mx-auto mt-4 animate-spin"/> :
                        roles.map((v, i)=>{
                            return(<li className="flex flex-row gap-3">
                                <Checkbox id={"role_"+i} checked={checkedRoles[v.id] ?? false} onCheckedChange={(c)=>{checkedRoles[v.id] = (c == true); sUpd(!upd)}}/>
                                <Label htmlFor={"role_"+i} className="my-auto text-base cursor-pointer">{v.name}</Label>
                            </li>)
                        })
                    }
                    </ul>
                </div>
            </div>
        </div>)
}