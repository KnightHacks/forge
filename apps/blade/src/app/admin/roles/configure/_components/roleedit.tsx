"use client";

import type { APIRole } from "discord-api-types/v10";
import type { ZodBoolean } from "zod";
import { useCallback, useEffect, useState } from "react";
import { Link, Loader2, Pencil, User, X } from "lucide-react";
import { z } from "zod";

import { PERMISSION_DATA, PERMISSIONS } from "@forge/consts";
import { Button } from "@forge/ui/button";
import { Checkbox } from "@forge/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  useForm,
} from "@forge/ui/form";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { toast } from "@forge/ui/toast";

import { getPermsAsList } from "~/lib/utils";
import { api } from "~/trpc/react";

export default function RoleEdit({
  oldRole,
}: {
  oldRole?: {
    id: string;
    name: string;
    permissions: string | null;
    discordRoleId: string;
  };
}) {
  const [name, setName] = useState(oldRole?.name || "");
  const [roleID, setRoleID] = useState(oldRole?.discordRoleId || "");

  const [role, setRole] = useState<APIRole | null>();
  const [loadingRole, setLoadingRole] = useState(false);
  const [isDupeID, setIsDupeID] = useState(false);
  const [isDupeName, setIsDupeName] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [permString, setPermString] = useState(
    "0".repeat(Object.keys(PERMISSIONS).length),
  );

  const roleQ = api.roles.getDiscordRole.useQuery(
    { roleId: roleID },
    {
      enabled: true,
      retry: false,
    },
  );

  const { data: roles } = api.roles.getAllLinks.useQuery();
  const { data: roleCounts } = api.roles.getDiscordRoleCounts.useQuery();
  const createLinkMutation = api.roles.createRoleLink.useMutation();
  const updateLinkMutation = api.roles.updateRoleLink.useMutation();
  // Create base form schema dynamically from consts
  const roleObj: Record<string, ZodBoolean> = {};
  const defaults: Record<string, boolean> = {};
  Object.keys(PERMISSIONS).map((v, i) => {
    roleObj[v] = z.boolean();
    if (oldRole) {
      defaults[v] = oldRole.permissions?.at(i) == "1";
    } else {
      defaults[v] = false;
    }
  });

  const roleSchema = z.object(roleObj);

  const form = useForm({
    schema: roleSchema,
    defaultValues: defaults,
  });

  const updateString = useCallback((values: z.infer<typeof roleSchema>) => {
    const perms = Object.entries(values);
    let newString = "";
    perms.forEach((v) => {
      if (v[1]) newString += "1";
      else newString += "0";
    });

    setPermString(newString);
  }, []);

  useEffect(() => {
    updateString(form.getValues());
  }, [form, updateString]);

  useEffect(() => {
    if (roles)
      setIsDupeID(
        oldRole
          ? false
          : roles.find((v) => v.discordRoleId == roleID) != undefined,
      );

    async function doGetRole() {
      setLoadingRole(true);
      setRole((await roleQ.refetch()).data);
      setLoadingRole(false);
    }

    void doGetRole();
  }, [oldRole, roleID, roleQ, roles]);

  useEffect(() => {
    if (roles)
      setIsDupeName(
        oldRole?.name == name
          ? false
          : roles.find((v) => v.name == name) != undefined,
      );
  }, [name, oldRole?.name, roles]);

  function sendRole(str: string) {
    try {
      if (oldRole) {
        setIsUpdating(true);
        updateLinkMutation.mutate(
          {
            name: name,
            id: oldRole.id,
            roleId: roleID,
            permissions: str,
          },
          {
            onSettled: () => {
              setIsUpdating(false);
              location.reload();
            },
            onError: (opts) => {
              toast.error(opts.message);
            },
          },
        );
      } else {
        setIsCreating(true);
        createLinkMutation.mutate(
          {
            name: name,
            roleId: roleID,
            permissions: str,
          },
          {
            onSettled: () => {
              setIsCreating(false);
              location.reload();
            },
            onError: (opts) => {
              toast.error(opts.message);
            },
          },
        );
      }
    } catch (error) {
      toast((error as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="mb-2 text-xl font-bold">{`${oldRole ? "Edit" : "Create"} Role`}</h2>
      <div className={`flex flex-col gap-2`}>
        <Label htmlFor="name">
          Role Name <span className="text-red-700">*</span>
        </Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          id="name"
          placeholder="ex. Officer"
          className={`col-span-2 ${isDupeName && "bg-red-900/25"}`}
        />
        {isDupeName && (
          <div className="flex flex-row gap-1">
            <X className="my-auto size-4 text-red-700" />
            <div className="my-auto text-sm font-medium text-red-700">
              There is already a role with this name.
            </div>
          </div>
        )}
      </div>
      <div className={`flex flex-col gap-2 ${oldRole && "hidden"}`}>
        <Label htmlFor="roleId">
          Discord Role ID <span className="text-red-700">*</span>
        </Label>
        <Input
          value={roleID}
          disabled={oldRole != undefined}
          onChange={(e) => setRoleID(e.target.value)}
          id="roleId"
          placeholder="ex. 1151884200069320805"
          className="col-span-2 font-mono"
        />
      </div>
      {loadingRole || !roles ? (
        <div className="flex flex-col gap-2">
          <div
            className={`text-sm font-medium text-muted-foreground ${oldRole && "hidden"}`}
          >
            The following role will be linked:
          </div>
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : role ? (
        <div className="flex flex-col gap-2">
          <div
            className={`text-sm font-medium text-muted-foreground ${oldRole && "hidden"}`}
          >
            {isDupeID ? (
              <div className="flex flex-row gap-1">
                <X className="my-auto size-4 text-red-700" />
                <div className="my-auto text-sm font-medium text-red-700">
                  This role is already linked.
                </div>
              </div>
            ) : (
              "The following role will be linked:"
            )}
          </div>
          <div
            className={`grid grid-cols-4 rounded-lg border-y p-2 ${isDupeID && "bg-red-900/25"}`}
          >
            <div className="col-span-3">
              <div
                className="my-auto flex w-fit max-w-full flex-row gap-1 rounded-full border px-2 py-1"
                style={{ borderColor: `#${role.color.toString(16)}` }}
              >
                <div
                  className="my-auto mr-1 size-3 rounded-full"
                  style={{ backgroundColor: `#${role.color.toString(16)}` }}
                />
                <div className="truncate text-sm font-medium">{role.name}</div>
              </div>
            </div>
            <div className="my-auto flex w-full flex-row justify-end text-sm font-medium">
              <div className="flex flex-row gap-1 p-1">
                <User className="size-5" />
                {roleCounts ? (
                  <div>{roleCounts[role.id] ?? 0}</div>
                ) : (
                  <Loader2 className="animate-spin" />
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-row gap-1">
          <X className="my-auto size-4 text-red-700" />
          <div className="my-auto text-sm font-medium text-red-700">
            Could not find a Discord role with this ID.
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Permissions</h3>
        <Form {...form}>
          <form
            onChange={() => updateString(form.getValues())}
            onSubmit={form.handleSubmit(updateString)}
            className="flex max-h-[40vh] flex-col overflow-y-scroll rounded-lg border"
          >
            {Object.entries(PERMISSION_DATA).map((v) => (
              <FormField
                control={form.control}
                name={v[0]}
                render={({ field }) => (
                  <FormItem className="flex flex-row gap-4 border-b p-3 duration-100 hover:bg-muted/50">
                    <FormControl>
                      <Checkbox
                        className="my-auto"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="flex flex-col gap-1">
                      <div className="my-auto">{v[1].name}</div>
                      <div className="my-auto text-sm text-muted-foreground">
                        {v[1].desc}
                      </div>
                    </FormLabel>
                  </FormItem>
                )}
              />
            ))}
          </form>
        </Form>
      </div>
      <div className="flex flex-row justify-between">
        <div className="my-auto text-sm font-medium">{`${getPermsAsList(permString).length} permission(s) applied`}</div>
        <Button
          disabled={
            !role ||
            name == "" ||
            loadingRole ||
            isDupeID ||
            isDupeName ||
            isCreating ||
            isUpdating
          }
          onClick={() => sendRole(permString)}
          className="my-auto flex flex-row gap-1"
        >
          {oldRole ? (
            <Pencil className="my-auto size-4" />
          ) : (
            <Link className="my-auto size-4" />
          )}
          {isCreating || isUpdating ? (
            <Loader2 className="animate-spin" />
          ) : (
            `${oldRole ? "Update" : "Create"} Link`
          )}{" "}
        </Button>
      </div>
    </div>
  );
}
