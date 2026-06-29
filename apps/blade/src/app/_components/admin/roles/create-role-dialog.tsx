"use client";

import { useMemo, useState } from "react";
import { Hash, Loader2, Plus, Search, ServerCrash } from "lucide-react";

import type { PERMISSIONS } from "@forge/consts";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";
import { RolePermissionEditor } from "./role-permission-editor";

const discordRolePattern = /^\d{17,20}$/;

export function CreateRoleDialog({
  onCreated,
  onOpenChange,
  open,
}: {
  onCreated: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const [mode, setMode] = useState<"manual" | "picker">("picker");
  const [query, setQuery] = useState("");
  const [manualRoleId, setManualRoleId] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<
    PERMISSIONS.PermissionKey[]
  >([]);
  const options = api.roles.listDiscordOptions.useQuery(undefined, {
    enabled: open,
    retry: false,
  });
  const preview = api.roles.previewDiscordRole.useQuery(manualRoleId.trim(), {
    enabled: open && mode === "manual" && discordRolePattern.test(manualRoleId),
    retry: false,
  });
  const create = api.roles.createLink.useMutation({
    onSuccess(result) {
      const failed = result.sync.summary.failed;
      toast.success(
        failed > 0
          ? `Role linked. Initial sync finished with ${failed} failure${failed === 1 ? "" : "s"}.`
          : "Role linked and synchronized.",
      );
      setSelectedRoleId(null);
      setSelectedPermissions([]);
      setManualRoleId("");
      setQuery("");
      onOpenChange(false);
      onCreated();
    },
    onError(error) {
      toast.error(error.message || "The role could not be linked.");
    },
  });
  const normalizedQuery = query.trim().toLocaleLowerCase("en-US");
  const filteredOptions = useMemo(
    () =>
      (options.data ?? []).filter((role) =>
        `${role.name} ${role.id}`
          .toLocaleLowerCase("en-US")
          .includes(normalizedQuery),
      ),
    [normalizedQuery, options.data],
  );
  const selectedOption = options.data?.find(
    (role) => role.id === selectedRoleId,
  );
  const manualRole = preview.data;
  const effectiveRoleId =
    mode === "picker" ? selectedOption?.id : manualRole?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94svh] max-w-3xl overflow-y-auto border-white/10 bg-card p-0">
        <DialogHeader className="border-b border-border/70 px-4 py-4 pr-12 text-left sm:px-6">
          <DialogTitle>Link a Discord role</DialogTitle>
          <DialogDescription>
            Choose a server role, then decide which Blade capabilities it
            grants. Leaving every permission off creates a cosmetic role.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-4 py-4 sm:px-6">
          <div className="grid grid-cols-2 gap-2 rounded-md border border-white/10 bg-background/60 p-1">
            <Button
              type="button"
              variant={mode === "picker" ? "secondary" : "ghost"}
              className="min-h-11"
              onClick={() => setMode("picker")}
            >
              Server roles
            </Button>
            <Button
              type="button"
              variant={mode === "manual" ? "secondary" : "ghost"}
              className="min-h-11"
              onClick={() => setMode("manual")}
            >
              Enter role ID
            </Button>
          </div>

          {mode === "picker" ? (
            <div className="space-y-3">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  aria-label="Search Discord roles"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search Discord roles"
                  className="h-11 pl-9"
                />
              </div>
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-white/10 bg-background/45 p-2">
                {options.isLoading ? (
                  <div className="flex min-h-24 items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading server
                    roles
                  </div>
                ) : options.isError ? (
                  <div className="flex min-h-24 items-center justify-center gap-2 text-sm text-muted-foreground">
                    <ServerCrash className="h-4 w-4" /> Discord roles are
                    unavailable.
                  </div>
                ) : filteredOptions.length === 0 ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    No eligible Discord roles match this search.
                  </p>
                ) : (
                  filteredOptions.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      aria-pressed={selectedRoleId === role.id}
                      className="flex min-h-11 w-full min-w-0 items-center gap-3 rounded-md border border-white/10 bg-background/60 px-3 py-2 text-left transition-colors hover:border-primary/30 hover:bg-primary/10 aria-pressed:border-primary/40 aria-pressed:bg-primary/15"
                      onClick={() => setSelectedRoleId(role.id)}
                    >
                      <span
                        className="h-3 w-3 shrink-0 rounded-full border border-white/20"
                        style={{ backgroundColor: role.hexColor ?? "#64748b" }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {role.name}
                        </span>
                        <span className="block truncate font-mono text-xs text-muted-foreground">
                          {role.id}
                        </span>
                      </span>
                      <Badge variant="outline" className="shrink-0">
                        {role.memberCount == null
                          ? "Count unavailable"
                          : `${role.memberCount} member${role.memberCount === 1 ? "" : "s"}`}
                      </Badge>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="space-y-2 text-sm font-medium">
                <span>Discord role ID</span>
                <div className="relative">
                  <Hash
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    value={manualRoleId}
                    onChange={(event) => setManualRoleId(event.target.value)}
                    placeholder="1151884200069320805"
                    className="h-11 pl-9 font-mono"
                  />
                </div>
              </label>
              {manualRoleId && !discordRolePattern.test(manualRoleId) && (
                <p className="text-sm text-destructive">
                  Enter a valid 17–20 digit Discord role ID.
                </p>
              )}
              {preview.isFetching && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Checking Discord
                </p>
              )}
              {manualRole && (
                <div className="flex min-w-0 items-center gap-3 rounded-md border border-primary/25 bg-primary/10 p-3">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{
                      backgroundColor: manualRole.hexColor ?? "#64748b",
                    }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {manualRole.name}
                    </p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {manualRole.id}
                    </p>
                  </div>
                </div>
              )}
              {preview.isError && discordRolePattern.test(manualRoleId) && (
                <p className="text-sm text-destructive">
                  {preview.error.message || "That role cannot be linked."}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <div>
              <h3 className="font-semibold">Blade permissions</h3>
              <p className="text-sm text-muted-foreground">
                The Discord role name is used exactly as shown above.
              </p>
            </div>
            <RolePermissionEditor
              selected={selectedPermissions}
              onChange={setSelectedPermissions}
            />
          </div>
        </div>

        <DialogFooter className="border-t border-border/70 px-4 py-3 sm:px-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!effectiveRoleId || create.isPending}
            onClick={() =>
              effectiveRoleId &&
              create.mutate({
                discordRoleId: effectiveRoleId,
                permissions: selectedPermissions,
              })
            }
          >
            {create.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Create role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
