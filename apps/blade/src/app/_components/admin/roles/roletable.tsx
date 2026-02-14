"use client";

import type { APIRole } from "discord-api-types/v10";
import { useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  Edit,
  Loader2,
  Trash,
  User,
  X,
} from "lucide-react";

import { Button } from "@forge/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@forge/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@forge/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@forge/ui/table";
import { toast } from "@forge/ui/toast";

import { getPermsAsList } from "~/lib/utils";
import { api } from "~/trpc/react";
import RoleEdit from "./roleedit";

export default function RoleTable() {
  const { data: roles } = api.roles.getAllLinks.useQuery();
  const discordRolesQ = api.roles.getDiscordRoles.useQuery(
    { roles: roles ?? [] },
    { enabled: false, retry: false },
  );
  const { data: roleCounts } = api.roles.getDiscordRoleCounts.useQuery();
  const deleteLinkMutation = api.roles.deleteRoleLink.useMutation();

  const [discordRoles, setDiscordRoles] = useState<
    (APIRole | null)[] | undefined
  >();
  const [copyConfirm, setCopyConfirm] = useState(-1);

  useEffect(() => {
    async function fetchDiscordRoles() {
      setDiscordRoles((await discordRolesQ.refetch()).data);
    }

    if (roles) void fetchDiscordRoles();
  }, [discordRolesQ, roles]);

  function deleteRole(id: string) {
    try {
      deleteLinkMutation.mutate({ id: id });
      location.reload();
    } catch (error) {
      toast((error as Error).message);
    }
  }

  return !roles ? (
    <Loader2 className="mx-auto mt-16 size-12 animate-spin" />
  ) : roles.length == 0 ? (
    <div className="mt-16 w-full text-center font-medium text-muted-foreground">
      There are currently no roles linked.
    </div>
  ) : (
    <Table className="mt-4 w-full rounded-lg">
      <TableHeader className="w-full text-left">
        <TableRow>
          <TableHead>Role Name</TableHead>
          <TableHead>Discord Role</TableHead>
          <TableHead>Permissions</TableHead>
          <TableHead>Members</TableHead>
          <TableHead className="text-center">Edit</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="">
        {roles.map((v, i) => {
          const role = discordRoles?.at(i);
          return (
            <TableRow id={"role" + i} className="">
              <TableCell>
                <div className="text-base font-medium">{v.name}</div>
              </TableCell>
              <TableCell>
                {discordRolesQ.status == "pending" ? (
                  <Loader2 className="my-auto animate-spin" />
                ) : role ? (
                  <div className="flex flex-row gap-2">
                    <button
                      type="button"
                      tabIndex={0}
                      onClick={() => {
                        void navigator.clipboard.writeText(v.discordRoleId);
                        setCopyConfirm(i);
                        toast(`Copied "${v.discordRoleId}" to clipboard!`);
                      }}
                      className={`cursor-pointer text-muted-foreground`}
                    >
                      {copyConfirm == i ? (
                        <Check className="my-auto size-4" />
                      ) : (
                        <Copy className="my-auto size-4" />
                      )}
                    </button>
                    <div
                      className="flex w-fit flex-row gap-1 rounded-full border px-2 py-1"
                      style={{ borderColor: `#${role.color.toString(16)}` }}
                    >
                      <div
                        className="my-auto mr-1 size-3 rounded-full"
                        style={{
                          backgroundColor: `#${role.color.toString(16)}`,
                        }}
                      />
                      <div className="truncate font-medium">{role.name}</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-row gap-1 text-red-700">
                    <X className="my-auto" />
                    <div className="my-auto font-medium">Not Found</div>
                  </div>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <div
                      tabIndex={0}
                      className="flex w-fit flex-row gap-1 rounded-lg border px-2 py-1 hover:bg-muted"
                    >
                      {getPermsAsList(v.permissions).length}
                      <ChevronDown className="my-auto size-4" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="p-2">
                    <h3 className="border-b p-1 pb-2 text-sm font-medium">
                      This role has the following permissions:
                    </h3>
                    <ul className="mt-1 max-h-48 list-disc overflow-y-auto px-4">
                      {getPermsAsList(v.permissions).map((p) => {
                        return (
                          <li className={`p-1 text-sm text-muted-foreground`}>
                            {p}
                          </li>
                        );
                      })}
                    </ul>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
              <TableCell>
                {roleCounts ? (
                  <div className="flex w-fit flex-row gap-1 p-2">
                    <User className="my-auto size-5" />
                    {roleCounts[v.discordRoleId] ?? 0}
                  </div>
                ) : (
                  <Loader2 className="my-auto animate-spin" />
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-row justify-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="p-2">
                        <Edit />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="overflow-y-clip">
                      <RoleEdit oldRole={v} />
                    </DialogContent>
                  </Dialog>
                  <Button
                    className="bg-red-700 p-2 hover:bg-red-900"
                    onClick={() => deleteRole(v.id)}
                  >
                    <Trash />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
