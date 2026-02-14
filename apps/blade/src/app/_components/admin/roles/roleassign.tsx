"use client";

import { useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  Filter,
  Loader2,
  Search,
  ShieldOff,
  ShieldPlus,
  UserCheck,
} from "lucide-react";

import { ResetIcon } from "@forge/ui";
import { Button } from "@forge/ui/button";
import { Checkbox } from "@forge/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@forge/ui/dropdown-menu";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@forge/ui/table";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

export default function RoleAssign() {
  const { data: users, status } = api.user.getUsers.useQuery();
  const { data: roles } = api.roles.getAllLinks.useQuery();

  const batchQ = api.roles.batchManagePermission.useMutation();

  const utils = api.useUtils();

  const mappedRoles: Record<
    string,
    { name: string; permissions: string; discordRoleId: string }
  > = {};

  roles?.forEach((v) => {
    mappedRoles[v.id] = {
      name: v.name,
      discordRoleId: v.discordRoleId,
      permissions: v.permissions,
    };
  });

  const [copyConfirm, setCopyConfirm] = useState(-1);
  const [searchTerm, setSearchTerm] = useState("");

  // weird hack to force the DOM to update
  const [upd, sUpd] = useState(false);

  const [checkedUsers, setCheckedUsers] = useState<Record<string, boolean>>({}); // stores userIds
  const [checkedRoles, _setCheckedRoles] = useState<Record<string, boolean>>(
    {},
  ); // stores roleIds
  // all checked roles will be applied to all checked users

  const [filterRoles, _setFilterRoles] = useState<Record<string, boolean>>({});

  const [countedUsers, setCountedUsers] = useState(0);

  useEffect(() => {
    let sum = 0;
    Object.entries(checkedUsers).forEach((v) => {
      if (v[1]) sum++;
    });
    setCountedUsers(sum);
  }, [checkedUsers, upd]);

  const filteredUsers = (users ?? []).filter((user) =>
    Object.values(filterRoles).includes(true) &&
    !user.permissions.find((v) => filterRoles[v.roleId])
      ? false
      : Object.values(user).some((value) => {
          if (value === null) return false;
          return typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean"
            ? value.toString().toLowerCase().includes(searchTerm.toLowerCase())
            : false;
        }),
  );

  const sendBatchRequest = (
    users: typeof checkedUsers,
    roles: typeof checkedRoles,
    revoking: boolean,
  ) => {
    const finalUsers = Object.entries(users)
      .map((v) => {
        if (v[1]) return v[0];
      })
      .filter((v) => v != undefined);
    const finalRoles = Object.entries(roles)
      .map((v) => {
        if (v[1]) return v[0];
      })
      .filter((v) => v != undefined);

    void batchQ.mutate(
      { roleIds: finalRoles, userIds: finalUsers, revoking },
      {
        onSuccess() {
          void utils.roles.getAllLinks.invalidate();
          location.reload();
        },
        onError(opts) {
          toast.error(opts.message);
        },
      },
    );
  };

  return (
    <div className="mt-8 flex w-full flex-col gap-4 md:grid md:grid-cols-4">
      <div className="col-span-3 flex w-full flex-col gap-4">
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
          <div
            tabIndex={0}
            title="Reset Checked Users"
            onClick={() => setCheckedUsers({})}
            className="my-auto flex h-full cursor-pointer flex-row gap-1 rounded-lg border px-2 py-1 hover:bg-muted"
          >
            <UserCheck className="my-auto size-5" />
            <div className="my-auto">{countedUsers}</div>
            <ResetIcon className="my-auto size-4" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <div
                tabIndex={0}
                title="Filter by Role"
                className="flex h-full w-fit flex-row gap-1 rounded-lg border px-2 py-1 hover:bg-muted"
              >
                <Filter className="my-auto size-5" />
                <ChevronDown className="my-auto size-4" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="p-4">
              <div className="text-small border-b pb-2 text-muted-foreground">
                Select roles to filter by:
              </div>
              <ul className="flex flex-col gap-4 p-2 pl-0 pt-4 font-medium">
                {!roles ? (
                  <Loader2 className="mx-auto mt-4 animate-spin" />
                ) : (
                  roles.map((v, i) => {
                    return (
                      <li className="flex flex-row gap-3">
                        <Checkbox
                          id={"role-f_" + i}
                          checked={filterRoles[v.id] ?? false}
                          onCheckedChange={(c) => {
                            filterRoles[v.id] = c == true;
                            sUpd(!upd);
                          }}
                        />
                        <Label
                          htmlFor={"role-f_" + i}
                          className="my-auto cursor-pointer text-base"
                        >
                          {v.name}
                        </Label>
                      </li>
                    );
                  })
                )}
              </ul>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {status == "pending" ? (
          <Loader2 className="mx-auto mt-4 animate-spin" />
        ) : !users ? (
          <div className="mx-auto mt-8 text-lg font-medium">
            Failed to get users.
          </div>
        ) : filteredUsers.length == 0 ? (
          <div className="mx-auto mt-8 text-lg font-medium">
            Could not find any users matching this search.
          </div>
        ) : (
          <Table>
            <TableHeader className="w-full text-left">
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Discord ID</TableHead>
                <TableHead>Roles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="max-h-[50vh] overflow-y-scroll">
              {filteredUsers.map((v, i) => {
                return (
                  <TableRow className={`${i % 2 == 1 && "bg-muted/20"}`}>
                    <TableCell className="flex flex-row gap-4 text-base font-semibold">
                      <Checkbox
                        id={"user_" + i}
                        checked={checkedUsers[v.id] ?? false}
                        onCheckedChange={(c) => {
                          checkedUsers[v.id] = c == true;
                          sUpd(!upd);
                        }}
                      />
                      <Label
                        htmlFor={"user_" + i}
                        className="my-auto cursor-pointer py-2"
                      >
                        {v.name}
                      </Label>
                    </TableCell>
                    <TableCell>
                      <div
                        tabIndex={0}
                        onClick={() => {
                          void navigator.clipboard.writeText(v.discordUserId);
                          setCopyConfirm(i);
                          toast(`Copied "${v.discordUserId}" to clipboard!`);
                        }}
                        className={`text-muted-foreground ${copyConfirm == i && "border-muted-foreground bg-muted"} flex w-fit cursor-pointer flex-row gap-1 rounded-full border px-2 py-1 hover:border-white hover:bg-muted hover:text-white`}
                      >
                        {copyConfirm == i ? (
                          <Check className="my-auto size-4" />
                        ) : (
                          <Copy className="my-auto size-4" />
                        )}
                        <div className="ml-1 truncate font-mono">{`${v.discordUserId}`}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {v.permissions.length == 0 ? (
                        ""
                      ) : v.permissions.length == 1 ? (
                        (mappedRoles[v.permissions.at(0)?.roleId || ""]?.name ??
                        "?")
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger>
                            <div
                              tabIndex={0}
                              className="flex w-fit flex-row gap-1 rounded-lg border px-2 py-1 hover:bg-muted"
                            >
                              {v.permissions.length}
                              <ChevronDown className="my-auto size-4" />
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="p-2">
                            <h3 className="border-b p-1 pb-2 text-sm font-medium">
                              This user has the following roles:
                            </h3>
                            <ul className="mt-1 max-h-48 list-disc overflow-y-auto px-4">
                              {v.permissions.map((p) => {
                                return (
                                  <li
                                    className={`p-1 text-sm text-muted-foreground`}
                                  >
                                    {mappedRoles[p.roleId]?.name ?? ""}
                                  </li>
                                );
                              })}
                            </ul>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
      <div className="flex h-fit flex-col gap-4 rounded-lg border-t border-primary py-2 pl-0 pt-4 sm:border-l sm:border-t-0 sm:pl-2 sm:pt-2">
        <div className="flex w-full flex-row gap-2">
          <div className="mt-auto w-full pl-2 text-xl font-semibold">
            Controls
          </div>
          <Button
            className="ml-1 size-8 p-1 px-2"
            title="Grant Selected Roles to Users"
            onClick={() => sendBatchRequest(checkedUsers, checkedRoles, false)}
          >
            <ShieldPlus className="size-4" />
          </Button>
          <Button
            className="size-8 bg-red-700 p-1 px-2"
            title="Revoke Selected Roles from Users"
            onClick={() => sendBatchRequest(checkedUsers, checkedRoles, true)}
          >
            <ShieldOff className="size-4" />
          </Button>
        </div>

        <div className="flex h-fit flex-col gap-2">
          <ul className="flex flex-col gap-4 border-t p-2 pt-4 font-medium">
            {!roles ? (
              <Loader2 className="mx-auto mt-4 animate-spin" />
            ) : (
              roles.map((v, i) => {
                return (
                  <li className="flex flex-row gap-3">
                    <Checkbox
                      id={"role_" + i}
                      checked={checkedRoles[v.id] ?? false}
                      onCheckedChange={(c) => {
                        checkedRoles[v.id] = c == true;
                        sUpd(!upd);
                      }}
                    />
                    <Label
                      htmlFor={"role_" + i}
                      className="my-auto cursor-pointer text-base"
                    >
                      {v.name}
                    </Label>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
