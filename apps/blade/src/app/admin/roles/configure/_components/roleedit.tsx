"use client"

import { PERMISSIONS, PERMISSION_DATA, PermissionKey } from "@forge/consts/knight-hacks";
import { Button } from "@forge/ui/button";
import { Checkbox } from "@forge/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, useForm } from "@forge/ui/form";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { toast } from "@forge/ui/toast";
import type { APIRole } from "discord-api-types/v10";
import { Link, Loader2, Pencil, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { z, ZodBoolean } from "zod";
import { getPermsAsList } from "~/lib/utils";
import { api } from "~/trpc/react";

export default function RoleEdit({oldRole}:{oldRole?:{id:string, name:string, permissions:string|null, discordRoleId: string}})
{
    const [name, setName] = useState(oldRole?.name || "")
    const [roleID, setRoleID] = useState(oldRole?.discordRoleId || "")

    const [role, setRole] = useState<APIRole | null>()
    const [loadingRole, setLoadingRole] = useState(false)
    const [isDupeID, setIsDupeID] = useState(false)
    const [isDupeName, setIsDupeName] = useState(false)

    const [permString, setPermString] = useState("0".repeat(Object.keys(PERMISSIONS).length))

    const roleQ = api.roles.getDiscordRole.useQuery({roleId:roleID}, {
        enabled: true,
        retry: false
    })

    const {data: roles} = api.roles.getAllLinks.useQuery()
    const {data: roleCounts} = api.roles.getDiscordRoleCounts.useQuery()
    const createLinkMutation = api.roles.createRoleLink.useMutation()
    const updateLinkMutation = api.roles.updateRoleLink.useMutation()

    // Create base form schema dynamically from consts
    const roleObj:Record<string,ZodBoolean> = {}
    const defaults:Record<string,boolean> = {}
    Object.keys(PERMISSIONS).map((v, i)=>{
        roleObj[v] = z.boolean()
        if(oldRole) {
            defaults[v] = oldRole.permissions?.at(i) == "1"
        } else {
            defaults[v] = false;
        }
    })

    const roleSchema = z.object(roleObj)

    const form = useForm({
        schema: roleSchema,
        defaultValues: defaults
    })

    useEffect(()=>{
        updateString(form.getValues())
    }, [])
    
    useEffect(()=>{
        if(roles) setIsDupeID(oldRole ? false : roles.find((v)=>(v.discordRoleId == roleID)) != undefined)

        async function doGetRole() {
            setLoadingRole(true)
            setRole((await roleQ.refetch()).data)
            setLoadingRole(false)
        }

        void doGetRole()
    },[roleID])

    useEffect(()=>{
        if(roles) setIsDupeName(oldRole && oldRole.name == name ? false : roles.find((v)=>(v.name == name)) != undefined)
    },[name])

    function updateString(values: z.infer<typeof roleSchema>) {
        const perms = Object.entries(values)
        console.log(perms)
        let newString = ""
        perms.forEach((v)=>{
            if(v[1])
                newString += "1"
            else
                newString += "0"
        })

        setPermString(newString)
    }

    function sendRole(str: string) {
        try {
            if(oldRole)
                updateLinkMutation.mutate({name: name, id: oldRole.id, roleId: roleID, permissions: str})
            else
                createLinkMutation.mutate({name: name, roleId: roleID, permissions: str})
            location.reload()
        } catch (error) {
            toast((error as Error).message)
        }
        
    }

    return(
        <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold mb-2">{`${oldRole ? "Edit" : "Create"} Role`}</h2>
            <div className={`flex flex-col gap-2`}>
                <Label htmlFor="name">Role Name <span className="text-red-700">*</span></Label>
                <Input value={name} onChange={(e)=>setName(e.target.value)} id="name" placeholder="ex. Officer" className={`col-span-2 ${isDupeName && "bg-red-900/25"}`}/>
                {isDupeName &&
                    <div className="flex flex-row gap-1">
                        <X className="text-red-700 size-4 my-auto"/>
                        <div className="text-red-700 text-sm font-medium my-auto">There is already a role with this name.</div>
                    </div>}
            </div>
            <div className={`flex flex-col gap-2 ${oldRole && "hidden"}`}>
                <Label htmlFor="roleId">Discord Role ID <span className="text-red-700">*</span></Label>
                <Input value={roleID} disabled={oldRole != undefined} onChange={(e)=>setRoleID(e.target.value)} id="roleId" placeholder="ex. 1151884200069320805" className="col-span-2 font-mono"/>
            </div>
            {loadingRole || !roles ? 
            <div className="flex flex-col gap-2">
                <div className={`text-sm font-medium text-muted-foreground ${oldRole && "hidden"}`}>The following role will be linked:</div>
                <Loader2 className="animate-spin size-6 text-muted-foreground"/>
            </div> :
            role ? 
            <div className="flex flex-col gap-2">
                <div className={`text-sm font-medium text-muted-foreground ${oldRole && "hidden"}`}>
                    {isDupeID ? 
                    <div className="flex flex-row gap-1">
                        <X className="text-red-700 size-4 my-auto"/>
                        <div className="text-red-700 text-sm font-medium my-auto">This role is already linked.</div>
                    </div> : "The following role will be linked:"}
                </div>
                <div className={`grid grid-cols-4 border-y p-2 rounded-lg ${isDupeID && "bg-red-900/25"}`}>
                    <div className="col-span-3">
                        <div className="border rounded-full py-1 px-2 w-fit max-w-full flex flex-row gap-1 my-auto" style={{borderColor: `#${role.color.toString(16)}`}}>
                            <div className="size-3 mr-1 rounded-full my-auto" style={{backgroundColor: `#${role.color.toString(16)}`}}/>
                            <div className="text-sm font-medium truncate">{role.name}</div>
                        </div>
                    </div>
                    <div className="my-auto text-sm font-medium w-full justify-end flex flex-row">
                        <div className="flex flex-row p-1 gap-1">
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
                <Form {...form}>
                    <form onChange={()=>updateString(form.getValues())} onSubmit={form.handleSubmit(updateString)} className="flex flex-col border rounded-lg overflow-y-scroll max-h-[40vh]">
                    {Object.entries(PERMISSION_DATA).map((v)=>(
                        <FormField 
                            control={form.control}
                            name={v[0]}
                            render={({field})=>
                            <FormItem className="flex flex-row gap-4 p-3 border-b hover:bg-muted/50 duration-100">
                                <FormControl>
                                    <Checkbox className="my-auto" checked={field.value} onCheckedChange={field.onChange}/>
                                </FormControl>
                                <FormLabel className="flex flex-col gap-1">
                                    <div className="my-auto">{v[1].name}</div>
                                    <div className="my-auto text-sm text-muted-foreground">{v[1].desc}</div>
                                </FormLabel>
                            </FormItem>}
                        />
                    ))}
                    </form>
                </Form>
            </div>
            <div className="flex flex-row justify-between">
                <div className="my-auto text-sm font-medium">{`${getPermsAsList(permString).length} permission(s) applied`}</div>
                <Button disabled={!role || name == "" || loadingRole || isDupeID || isDupeName} onClick={()=>sendRole(permString)} className="my-auto flex flex-row gap-1">
                    {oldRole ? <Pencil className="size-4 my-auto"/> : <Link className="size-4 my-auto"/>}
                    {`${oldRole ? "Update" : "Create"} Link`}
                </Button>
            </div>
        </div>
    )
}