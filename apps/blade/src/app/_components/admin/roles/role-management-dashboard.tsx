"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  UsersRound,
  X,
} from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import type {
  RoleManagementInput,
  RoleManagementPageSize,
  RoleManagementType,
} from "@forge/validators";
import { PERMISSIONS } from "@forge/consts";
import { cn } from "@forge/ui";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader } from "@forge/ui/card";
import { Checkbox } from "@forge/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@forge/ui/table";
import { toast } from "@forge/ui/toast";
import { roleManagementPageSizes } from "@forge/validators";

import { api } from "~/trpc/react";
import { CreateRoleDialog } from "./create-role-dialog";
import { buildRoleManagementSearchParams } from "./params";
import { RoleDetailDialog } from "./role-detail-dialog";

type LinkedRoles = RouterOutputs["roles"]["listLinks"];
type LinkedRole = LinkedRoles[number];
type RoleDetail = RouterOutputs["roles"]["getRole"];
type RoleUsers = RouterOutputs["roles"]["listUsers"];
type RoleUser = RoleUsers["users"][number];

interface RoleManagementAccess {
  canAssign: boolean;
  canConfigure: boolean;
}

function roleManagementHref(input: RoleManagementInput) {
  const query = buildRoleManagementSearchParams(input).toString();
  return query ? `/admin/roles?${query}` : "/admin/roles";
}

function displayUserName(user: RoleUser) {
  return user.memberName || user.name || user.email || "Unnamed Blade user";
}

function RoleStatus({ role }: { role: LinkedRole }) {
  if (role.isMissing) {
    return <Badge variant="destructive">Discord role missing</Badge>;
  }
  if (role.syncState === "unavailable") {
    return <Badge variant="outline">Discord unavailable</Badge>;
  }
  return <Badge variant="outline">Linked</Badge>;
}

function RoleIdentity({ role }: { role: LinkedRole }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/20"
        style={{ backgroundColor: role.teamHexcodeColor ?? "#64748b" }}
        aria-hidden="true"
      />
      <span className="min-w-0">
        <span className="block truncate font-medium">{role.name}</span>
        <span className="block truncate font-mono text-sm text-muted-foreground">
          {role.discordRoleId}
        </span>
      </span>
    </div>
  );
}

function RoleFiltersDialog({
  input,
  onApply,
}: {
  input: RoleManagementInput;
  onApply: (next: RoleManagementInput) => void;
}) {
  const [open, setOpen] = useState(false);
  const [roleTypes, setRoleTypes] = useState<RoleManagementType[]>(
    input.roleTypes,
  );
  const [permissionKeys, setPermissionKeys] = useState<
    PERMISSIONS.PermissionKey[]
  >(input.permissionKeys);

  const toggleType = (type: RoleManagementType, checked: boolean) => {
    setRoleTypes((current) =>
      checked
        ? [...new Set([...current, type])]
        : current.filter((candidate) => candidate !== type),
    );
  };
  const togglePermission = (
    permission: PERMISSIONS.PermissionKey,
    checked: boolean,
  ) => {
    setPermissionKeys((current) =>
      checked
        ? [...new Set([...current, permission])]
        : current.filter((candidate) => candidate !== permission),
    );
  };
  const activeCount = input.roleTypes.length + input.permissionKeys.length;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-11"
        onClick={() => {
          setRoleTypes(input.roleTypes);
          setPermissionKeys(input.permissionKeys);
          setOpen(true);
        }}
      >
        <Filter className="h-4 w-4" /> Filters
        {activeCount > 0 && <Badge variant="secondary">{activeCount}</Badge>}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92svh] max-w-xl overflow-y-auto border-white/10 bg-card p-0">
          <DialogHeader className="border-b border-border/70 px-4 py-4 pr-12 text-left sm:px-6">
            <DialogTitle>Filter roles</DialogTitle>
            <DialogDescription>
              Types match any selected value. A role must grant every selected
              permission.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 px-4 py-4 sm:px-6">
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">Role type</legend>
              {(
                [
                  ["access", "Access"],
                  ["cosmetic", "Cosmetic"],
                  ["missing", "Discord role missing"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-white/10 bg-background/60 px-3"
                >
                  <Checkbox
                    checked={roleTypes.includes(value)}
                    onCheckedChange={(checked) =>
                      toggleType(value, checked === true)
                    }
                  />
                  <span className="text-sm font-medium">{label}</span>
                </label>
              ))}
            </fieldset>
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">
                Granted permissions
              </legend>
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border border-white/10 bg-background/45 p-2">
                {Object.entries(PERMISSIONS.PERMISSION_DATA)
                  .sort(([, left], [, right]) => left.idx - right.idx)
                  .map(([key, permission]) => {
                    const typedKey = key;
                    return (
                      <label
                        key={key}
                        className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-white/10 bg-background/60 px-3 py-2"
                      >
                        <Checkbox
                          checked={permissionKeys.includes(typedKey)}
                          onCheckedChange={(checked) =>
                            togglePermission(typedKey, checked === true)
                          }
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">
                            {permission.name}
                          </span>
                          <span className="block truncate text-sm text-muted-foreground">
                            {permission.desc}
                          </span>
                        </span>
                      </label>
                    );
                  })}
              </div>
            </fieldset>
          </div>
          <DialogFooter className="border-t border-border/70 px-4 py-3 sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPermissionKeys([]);
                setRoleTypes([]);
              }}
            >
              Clear
            </Button>
            <Button
              type="button"
              onClick={() => {
                onApply({
                  ...input,
                  page: 1,
                  permissionKeys,
                  roleTypes,
                });
                setOpen(false);
              }}
            >
              Apply filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AssignmentRoleFilters({
  input,
  roles,
  onApply,
}: {
  input: RoleManagementInput;
  roles: LinkedRoles;
  onApply: (next: RoleManagementInput) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(input.userRoleIds);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-11"
        onClick={() => {
          setSelected(input.userRoleIds);
          setOpen(true);
        }}
      >
        <Filter className="h-4 w-4" /> Assigned roles
        {input.userRoleIds.length > 0 && (
          <Badge variant="secondary">{input.userRoleIds.length}</Badge>
        )}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90svh] max-w-lg overflow-y-auto border-white/10 bg-card p-0">
          <DialogHeader className="border-b border-border/70 px-4 py-4 pr-12 text-left sm:px-6">
            <DialogTitle>Filter assigned roles</DialogTitle>
            <DialogDescription>
              Users must hold every selected role.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[55svh] space-y-2 overflow-y-auto px-4 py-4 sm:px-6">
            {roles.map((role) => (
              <label
                key={role.id}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-white/10 bg-background/60 px-3 py-2"
              >
                <Checkbox
                  checked={selected.includes(role.id)}
                  onCheckedChange={(checked) =>
                    setSelected((current) =>
                      checked === true
                        ? [...new Set([...current, role.id])]
                        : current.filter((id) => id !== role.id),
                    )
                  }
                />
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{
                    backgroundColor: role.teamHexcodeColor ?? "#64748b",
                  }}
                  aria-hidden="true"
                />
                <span className="min-w-0 truncate text-sm font-medium">
                  {role.name}
                </span>
              </label>
            ))}
          </div>
          <DialogFooter className="border-t border-border/70 px-4 py-3 sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelected([])}
            >
              Clear
            </Button>
            <Button
              type="button"
              onClick={() => {
                onApply({ ...input, page: 1, userRoleIds: selected });
                setOpen(false);
              }}
            >
              Apply filter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RoleList({
  input,
  isNavigating,
  onNavigate,
  onRefresh,
  roles,
}: {
  input: RoleManagementInput;
  isNavigating: boolean;
  onNavigate: (next: RoleManagementInput) => void;
  onRefresh: () => void;
  roles: LinkedRoles;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState(input.roleQuery);
  const [syncingRoleId, setSyncingRoleId] = useState<string | null>(null);
  const sync = api.roles.syncRole.useMutation({
    onSuccess(result) {
      toast.success(
        `Sync complete: ${result.summary.added} added, ${result.summary.removed} removed, ${result.summary.failed} failed.`,
      );
      setSyncingRoleId(null);
      onRefresh();
    },
    onError(error) {
      setSyncingRoleId(null);
      toast.error(error.message || "The role could not be synchronized.");
    },
  });
  const filteredRoles = useMemo(() => {
    const normalizedQuery = input.roleQuery.trim().toLocaleLowerCase("en-US");
    return roles.filter((role) => {
      const matchesQuery =
        !normalizedQuery ||
        `${role.name} ${role.discordRoleId}`
          .toLocaleLowerCase("en-US")
          .includes(normalizedQuery);
      const matchesType =
        input.roleTypes.length === 0 ||
        input.roleTypes.some((type) => {
          if (type === "access") return !role.isCosmetic;
          if (type === "cosmetic") return role.isCosmetic;
          return role.isMissing;
        });
      const matchesPermissions = input.permissionKeys.every((permission) =>
        role.permissions.includes(permission),
      );
      return matchesQuery && matchesType && matchesPermissions;
    });
  }, [input.permissionKeys, input.roleQuery, input.roleTypes, roles]);

  const openRole = (roleId: string) => onNavigate({ ...input, role: roleId });

  return (
    <>
      <Card className="border-white/10 bg-card/95 shadow-2xl shadow-black/25">
        <CardHeader className="gap-4 border-b border-border/70 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold leading-none">
                Linked Discord roles
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Configure access roles and permission-free cosmetic roles.
              </p>
            </div>
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Create role
            </Button>
          </div>
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-center"
            onSubmit={(event) => {
              event.preventDefault();
              onNavigate({ ...input, page: 1, roleQuery: query });
            }}
          >
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                aria-label="Search linked roles"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search role name or Discord ID"
                className="h-11 pl-9"
              />
            </div>
            <Button
              type="submit"
              variant="secondary"
              className="h-11"
              disabled={isNavigating}
            >
              {isNavigating && <Loader2 className="h-4 w-4 animate-spin" />}
              Search
            </Button>
            <RoleFiltersDialog input={input} onApply={onNavigate} />
          </form>
          {(input.roleTypes.length > 0 ||
            input.permissionKeys.length > 0 ||
            input.roleQuery) && (
            <div className="flex flex-wrap gap-2">
              {input.roleQuery && (
                <Badge variant="secondary" className="gap-1">
                  Search: {input.roleQuery}
                  <button
                    type="button"
                    aria-label="Clear role search"
                    onClick={() => {
                      setQuery("");
                      onNavigate({ ...input, roleQuery: "" });
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </Badge>
              )}
              {input.roleTypes.map((type) => (
                <Badge key={type} variant="secondary" className="gap-1">
                  {type}
                  <button
                    type="button"
                    aria-label={`Remove ${type} role filter`}
                    onClick={() =>
                      onNavigate({
                        ...input,
                        roleTypes: input.roleTypes.filter(
                          (candidate) => candidate !== type,
                        ),
                      })
                    }
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </Badge>
              ))}
              {input.permissionKeys.map((permission) => (
                <Badge key={permission} variant="outline" className="gap-1">
                  {PERMISSIONS.PERMISSION_DATA[permission]?.name ?? permission}
                  <button
                    type="button"
                    aria-label={`Remove ${permission} permission filter`}
                    onClick={() =>
                      onNavigate({
                        ...input,
                        permissionKeys: input.permissionKeys.filter(
                          (candidate) => candidate !== permission,
                        ),
                      })
                    }
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </Badge>
              ))}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setQuery("");
                  onNavigate({
                    ...input,
                    permissionKeys: [],
                    roleQuery: "",
                    roleTypes: [],
                  });
                }}
              >
                Clear all
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {filteredRoles.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-5 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/15 text-primary">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="font-semibold">No roles found</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Try a broader search or clear the filters to see every linked
                role.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Discord role</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Discord members</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell className="min-w-64">
                          <RoleIdentity role={role} />
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={role.isCosmetic ? "secondary" : "default"}
                          >
                            {role.isCosmetic ? "Cosmetic" : "Access"}
                          </Badge>
                        </TableCell>
                        <TableCell>{role.permissions.length}</TableCell>
                        <TableCell>
                          {role.memberCount ?? "Unavailable"}
                        </TableCell>
                        <TableCell>
                          <RoleStatus role={role} />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              aria-label={`Sync ${role.name}`}
                              disabled={role.isMissing || sync.isPending}
                              onClick={() => {
                                setSyncingRoleId(role.id);
                                sync.mutate({ roleId: role.id });
                              }}
                            >
                              {syncingRoleId === role.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                              Sync
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => openRole(role.id)}
                            >
                              Configure
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="grid min-w-0 gap-2 p-2 sm:p-3 md:hidden">
                {filteredRoles.map((role) => (
                  <div
                    key={role.id}
                    className="min-w-0 overflow-hidden rounded-md border border-white/10 bg-background/60 p-3"
                  >
                    <RoleIdentity role={role} />
                    <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
                      <Badge
                        variant={role.isCosmetic ? "secondary" : "default"}
                      >
                        {role.isCosmetic ? "Cosmetic" : "Access"}
                      </Badge>
                      <RoleStatus role={role} />
                      <span className="text-sm text-muted-foreground">
                        {role.permissions.length} permissions
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="min-w-0 px-2"
                        aria-label={`Sync ${role.name}`}
                        disabled={role.isMissing || sync.isPending}
                        onClick={() => {
                          setSyncingRoleId(role.id);
                          sync.mutate({ roleId: role.id });
                        }}
                      >
                        {syncingRoleId === role.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        Sync
                      </Button>
                      <Button
                        type="button"
                        className="min-w-0 px-2"
                        onClick={() => openRole(role.id)}
                      >
                        Configure
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="border-t border-border/70 px-4 py-3 text-sm text-muted-foreground sm:px-6">
            {filteredRoles.length} of {roles.length} linked roles
          </div>
        </CardContent>
      </Card>
      <CreateRoleDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={onRefresh}
      />
    </>
  );
}

function AssignmentPanel({
  input,
  isNavigating,
  onNavigate,
  onRefresh,
  roles,
  users,
}: {
  input: RoleManagementInput;
  isNavigating: boolean;
  onNavigate: (next: RoleManagementInput) => void;
  onRefresh: () => void;
  roles: LinkedRoles;
  users: RoleUsers;
}) {
  const [query, setQuery] = useState(input.userQuery);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<"grant" | "revoke" | null>(
    null,
  );
  const batch = api.roles.batchAssign.useMutation({
    onSuccess(result) {
      const failed = result.failed.length;
      const skipped = result.skipped.length;
      const succeeded = result.succeeded.length;
      const message = `${succeeded} succeeded, ${skipped} skipped, ${failed} failed.`;
      if (failed > 0) toast.error(`Batch finished with failures. ${message}`);
      else toast.success(`Batch complete. ${message}`);
      setPendingAction(null);
      setSelectedUsers([]);
      onRefresh();
    },
    onError(error) {
      toast.error(
        error.message || "The role assignment could not be completed.",
      );
    },
  });
  const pairCount = selectedUsers.length * selectedRoles.length;
  const availableRoles = roles.filter((role) => !role.isMissing);
  const { page, pageCount, pageSize, totalCount } = users.pagination;
  const firstResult = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastResult = Math.min(page * pageSize, totalCount);

  const toggleUser = (userId: string, checked: boolean) =>
    setSelectedUsers((current) =>
      checked
        ? [...new Set([...current, userId])]
        : current.filter((id) => id !== userId),
    );
  const toggleRole = (roleId: string, checked: boolean) =>
    setSelectedRoles((current) =>
      checked
        ? [...new Set([...current, roleId])]
        : current.filter((id) => id !== roleId),
    );

  return (
    <>
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card className="min-w-0 border-white/10 bg-card/95 shadow-2xl shadow-black/25">
          <CardHeader className="gap-4 border-b border-border/70 p-4 sm:p-6">
            <div>
              <h2 className="font-semibold leading-none">Blade users</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Search every auth user, including people without a member
                profile.
              </p>
            </div>
            <form
              className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center"
              onSubmit={(event) => {
                event.preventDefault();
                onNavigate({ ...input, page: 1, userQuery: query });
              }}
            >
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  aria-label="Search Blade users"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search name, email, or Discord identity"
                  className="h-11 pl-9"
                />
              </div>
              <Button
                type="submit"
                variant="secondary"
                className="h-11"
                disabled={isNavigating}
              >
                {isNavigating && <Loader2 className="h-4 w-4 animate-spin" />}
                Search
              </Button>
              <AssignmentRoleFilters
                input={input}
                roles={roles}
                onApply={onNavigate}
              />
            </form>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedUsers.length} user
                {selectedUsers.length === 1 ? "" : "s"}
                {" selected"}
              </p>
              <div className="flex items-center gap-2">
                <Label htmlFor="role-user-page-size" className="text-sm">
                  Per page
                </Label>
                <Select
                  value={String(input.pageSize)}
                  onValueChange={(value) =>
                    onNavigate({
                      ...input,
                      page: 1,
                      pageSize: Number(value) as RoleManagementPageSize,
                    })
                  }
                >
                  <SelectTrigger id="role-user-page-size" className="h-11 w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleManagementPageSizes.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {input.userRoleIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {input.userRoleIds.map((roleId) => (
                  <Badge key={roleId} variant="outline" className="gap-1">
                    {roles.find((role) => role.id === roleId)?.name ??
                      "Unknown role"}
                    <button
                      type="button"
                      aria-label="Remove assigned-role filter"
                      onClick={() =>
                        onNavigate({
                          ...input,
                          page: 1,
                          userRoleIds: input.userRoleIds.filter(
                            (candidate) => candidate !== roleId,
                          ),
                        })
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {users.users.length === 0 ? (
              <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-5 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <UsersRound className="h-6 w-6" />
                </div>
                <h2 className="font-semibold">No users found</h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  Try a broader identity search or remove an assigned-role
                  filter.
                </p>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            aria-label="Select all users on this page"
                            checked={
                              users.users.length > 0 &&
                              users.users.every((user) =>
                                selectedUsers.includes(user.id),
                              )
                            }
                            onCheckedChange={(checked) =>
                              setSelectedUsers(
                                checked === true
                                  ? users.users.map((user) => user.id)
                                  : [],
                              )
                            }
                          />
                        </TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Assigned roles</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Checkbox
                              aria-label={`Select ${displayUserName(user)}`}
                              checked={selectedUsers.includes(user.id)}
                              onCheckedChange={(checked) =>
                                toggleUser(user.id, checked === true)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">
                              {displayUserName(user)}
                            </p>
                            {user.name && user.name !== user.memberName && (
                              <p className="text-sm text-muted-foreground">
                                @{user.name}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex max-w-md flex-wrap gap-1.5">
                              {user.roleIds.length === 0 ? (
                                <span className="text-sm text-muted-foreground">
                                  None
                                </span>
                              ) : (
                                user.roleIds.map((roleId) => (
                                  <Badge key={roleId} variant="outline">
                                    {roles.find((role) => role.id === roleId)
                                      ?.name ?? "Unlinked role"}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="grid min-w-0 gap-2 p-2 sm:p-3 md:hidden">
                  {users.users.map((user) => (
                    <label
                      key={user.id}
                      className="flex min-h-20 min-w-0 cursor-pointer items-start gap-3 overflow-hidden rounded-md border border-white/10 bg-background/60 p-3"
                    >
                      <Checkbox
                        aria-label={`Select ${displayUserName(user)}`}
                        className="mt-1"
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={(checked) =>
                          toggleUser(user.id, checked === true)
                        }
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {displayUserName(user)}
                        </span>
                        <span className="block truncate text-sm text-muted-foreground">
                          {user.email ?? user.name ?? "No additional identity"}
                        </span>
                        <span className="mt-2 flex min-w-0 flex-wrap gap-1">
                          {user.roleIds.slice(0, 3).map((roleId) => (
                            <Badge key={roleId} variant="outline">
                              {roles.find((role) => role.id === roleId)?.name ??
                                "Unlinked role"}
                            </Badge>
                          ))}
                          {user.roleIds.length > 3 && (
                            <Badge variant="secondary">
                              +{user.roleIds.length - 3}
                            </Badge>
                          )}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </>
            )}
            <div className="flex min-w-0 flex-col gap-3 border-t border-border/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-sm text-muted-foreground">
                Showing {firstResult}-{lastResult} of {totalCount} users
              </p>
              <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
                <span className="col-span-2 text-center text-sm sm:order-2 sm:min-w-24">
                  Page {page} of {pageCount}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  className="sm:order-1"
                  disabled={page <= 1 || isNavigating}
                  onClick={() => onNavigate({ ...input, page: page - 1 })}
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="sm:order-3"
                  disabled={page >= pageCount || isNavigating}
                  onClick={() => onNavigate({ ...input, page: page + 1 })}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <div className="overflow-hidden rounded-lg border border-white/10 bg-card/95 shadow-xl shadow-black/20">
            <div className="border-b border-border/70 p-4">
              <h2 className="font-semibold">Assignment tray</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose roles, then grant or revoke every selected pair.
              </p>
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto p-3">
              {availableRoles.map((role) => (
                <label
                  key={role.id}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-white/10 bg-background/60 px-3 py-2"
                >
                  <Checkbox
                    aria-label={`Select role ${role.name}`}
                    checked={selectedRoles.includes(role.id)}
                    onCheckedChange={(checked) =>
                      toggleRole(role.id, checked === true)
                    }
                  />
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{
                      backgroundColor: role.teamHexcodeColor ?? "#64748b",
                    }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {role.name}
                  </span>
                  {role.isCosmetic && (
                    <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </label>
              ))}
            </div>
            <div className="space-y-3 border-t border-border/70 p-4">
              <div className="rounded-md border border-primary/25 bg-primary/10 p-3">
                <p className="text-sm text-muted-foreground">Batch preview</p>
                <p className="mt-1 text-lg font-semibold">
                  {pairCount} user-role pair{pairCount === 1 ? "" : "s"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  disabled={pairCount === 0 || batch.isPending}
                  onClick={() => setPendingAction("grant")}
                >
                  <UserRoundCheck className="h-4 w-4" /> Grant
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={pairCount === 0 || batch.isPending}
                  onClick={() => setPendingAction("revoke")}
                >
                  <X className="h-4 w-4" /> Revoke
                </Button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <Dialog
        open={pendingAction != null}
        onOpenChange={(open) => !open && setPendingAction(null)}
      >
        <DialogContent className="max-w-md border-white/10 bg-card">
          <DialogHeader className="text-left">
            <DialogTitle>
              {pendingAction === "grant" ? "Grant" : "Revoke"} selected roles?
            </DialogTitle>
            <DialogDescription>
              This will attempt {pairCount} user-role pair
              {pairCount === 1 ? "" : "s"}. Discord must succeed before Blade
              changes each pair.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-white/10 bg-background/60 p-3 text-sm">
            {selectedUsers.length} users × {selectedRoles.length} roles ={" "}
            <strong>{pairCount} pairs</strong>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingAction(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={pendingAction === "revoke" ? "destructive" : "primary"}
              disabled={batch.isPending || pendingAction == null}
              onClick={() =>
                pendingAction &&
                batch.mutate({
                  action: pendingAction,
                  roleIds: selectedRoles,
                  userIds: selectedUsers,
                })
              }
            >
              {batch.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm {pendingAction}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function RoleManagementDashboard({
  access,
  detail,
  input,
  roles,
  users,
}: {
  access: RoleManagementAccess;
  detail: RoleDetail | null;
  input: RoleManagementInput;
  roles: LinkedRoles;
  users: RoleUsers | null;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const [isNavigating, startTransition] = useTransition();
  const roleRows = roles;
  const effectiveView =
    input.view === "assignments" && access.canAssign
      ? "assignments"
      : access.canConfigure
        ? "roles"
        : "assignments";

  const navigate = (next: RoleManagementInput) => {
    startTransition(() => router.replace(roleManagementHref(next)));
  };
  const refresh = () => {
    void utils.roles.listLinks.invalidate();
    void utils.roles.listUsers.invalidate();
    void utils.roles.getRole.invalidate();
    router.refresh();
  };
  const closeDetail = () => navigate({ ...input, role: undefined });

  return (
    <main
      className="container min-w-0 space-y-5 pb-16 pt-6 md:pt-10"
      data-role-management-layout="responsive"
    >
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary">Administration</p>
          <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">
            Role management
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Link Discord roles to Blade access and keep user assignments in
            sync.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-[hsl(var(--chart-2))]" />
          {roleRows.length} linked roles
        </div>
      </div>

      <nav
        aria-label="Role management sections"
        className="inline-flex min-h-11 max-w-full gap-1 overflow-x-auto rounded-md border border-white/10 bg-card/95 p-1 shadow-lg shadow-black/15"
      >
        {access.canConfigure && (
          <Link
            href={roleManagementHref({
              ...input,
              page: 1,
              role: undefined,
              view: "roles",
            })}
            aria-current={effectiveView === "roles" ? "page" : undefined}
            className={cn(
              "flex min-h-9 items-center gap-2 whitespace-nowrap rounded-sm px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              effectiveView === "roles"
                ? "bg-primary/20 text-foreground"
                : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
            )}
          >
            <ShieldCheck className="h-4 w-4" /> Roles
          </Link>
        )}
        {access.canAssign && (
          <Link
            href={roleManagementHref({
              ...input,
              page: 1,
              role: undefined,
              view: "assignments",
            })}
            aria-current={effectiveView === "assignments" ? "page" : undefined}
            className={cn(
              "flex min-h-9 items-center gap-2 whitespace-nowrap rounded-sm px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              effectiveView === "assignments"
                ? "bg-primary/20 text-foreground"
                : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
            )}
          >
            <UsersRound className="h-4 w-4" /> Assignments
          </Link>
        )}
      </nav>

      {isNavigating && (
        <div
          className="flex items-center gap-2 text-sm text-muted-foreground"
          role="status"
        >
          <Loader2 className="h-4 w-4 animate-spin" /> Updating view
        </div>
      )}

      {effectiveView === "roles" && access.canConfigure ? (
        <RoleList
          input={input}
          isNavigating={isNavigating}
          onNavigate={navigate}
          onRefresh={refresh}
          roles={roleRows}
        />
      ) : users ? (
        <AssignmentPanel
          input={input}
          isNavigating={isNavigating}
          onNavigate={navigate}
          onRefresh={refresh}
          roles={roleRows}
          users={users}
        />
      ) : (
        <div className="flex min-h-64 items-center justify-center rounded-lg border border-destructive/30 bg-card/95 p-6 text-center">
          <div className="max-w-md">
            <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
            <h2 className="mt-3 font-semibold">Assignments unavailable</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Reload the page. If this continues, Discord or the role service
              may be unavailable.
            </p>
          </div>
        </div>
      )}

      {detail && access.canConfigure && (
        <RoleDetailDialog
          key={detail.id}
          detail={detail}
          onChanged={refresh}
          onClose={closeDetail}
        />
      )}
    </main>
  );
}
