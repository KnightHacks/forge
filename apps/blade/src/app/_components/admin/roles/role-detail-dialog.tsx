"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UsersRound,
} from "lucide-react";

import type { RouterOutputs } from "@forge/api";
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
import { ROLE_UNLINK_CONFIRMATION } from "@forge/validators";

import { api } from "~/trpc/react";
import { RolePermissionEditor } from "./role-permission-editor";

type RoleDetail = RouterOutputs["roles"]["getRole"];

export function RoleDetailDialog({
  detail,
  onChanged,
  onClose,
}: {
  detail: RoleDetail;
  onChanged: () => void;
  onClose: () => void;
}) {
  const [permissions, setPermissions] = useState<PERMISSIONS.PermissionKey[]>([
    ...detail.permissions,
  ]);
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const update = api.roles.updatePermissions.useMutation({
    onSuccess() {
      toast.success("Role permissions saved.");
      onChanged();
    },
    onError(error) {
      toast.error(error.message || "Role permissions could not be saved.");
    },
  });
  const sync = api.roles.syncRole.useMutation({
    onSuccess(result) {
      toast.success(
        `Sync complete: ${result.summary.added} added, ${result.summary.removed} removed, ${result.summary.failed} failed.`,
      );
      onChanged();
    },
    onError(error) {
      toast.error(error.message || "The role could not be synchronized.");
    },
  });
  const unlink = api.roles.unlinkRole.useMutation({
    onSuccess() {
      toast.success("Blade role unlinked. Discord was left unchanged.");
      setUnlinkOpen(false);
      onClose();
      onChanged();
    },
    onError(error) {
      toast.error(error.message || "The role could not be unlinked.");
    },
  });
  const changed = permissions.join("|") !== detail.permissions.join("|");
  const hasDependencies = (detail.dependencies?.total ?? 0) > 0;
  const eventDependencies = detail.dependencies?.events ?? 0;
  const eventBlockers = detail.dependencies?.eventBlockers ?? [];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-role-detail-layout="sectioned"
        className="max-h-[94svh] max-w-4xl overflow-y-auto border-white/10 bg-card p-0"
      >
        <DialogHeader className="border-b border-border/70 px-4 py-4 pr-12 text-left sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="h-4 w-4 shrink-0 rounded-full border border-white/20"
              style={{
                backgroundColor: detail.teamHexcodeColor ?? "#64748b",
              }}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <DialogTitle className="truncate">{detail.name}</DialogTitle>
              <DialogDescription className="truncate font-mono text-xs">
                {detail.discordRoleId}
              </DialogDescription>
            </div>
            <Badge
              variant={detail.isCosmetic ? "secondary" : "default"}
              className="ml-auto mr-5 shrink-0"
            >
              {detail.isCosmetic ? "Cosmetic" : "Access"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-5 px-4 py-4 sm:px-6">
          {detail.isMissing && (
            <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
              <div className="text-sm">
                <p className="font-medium">Discord role missing</p>
                <p className="mt-0.5 text-muted-foreground">
                  Restore the role in Discord before editing, assigning, or
                  synchronizing it.
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-white/10 bg-background/60 p-3">
              <p className="text-sm text-muted-foreground">Discord members</p>
              <p className="mt-1 flex items-center gap-2 font-medium">
                <UsersRound className="h-4 w-4 text-primary" />
                {detail.memberCount ?? "Unavailable"}
              </p>
            </div>
            <div className="rounded-md border border-white/10 bg-background/60 p-3">
              <p className="text-sm text-muted-foreground">Blade assignments</p>
              <p className="mt-1 font-medium">{detail.assignmentCount}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-background/60 p-3">
              <p className="text-sm text-muted-foreground">Used elsewhere</p>
              <p className="mt-1 font-medium">{detail.dependencyCount}</p>
            </div>
          </div>

          {detail.dependencies && (
            <section className="space-y-2" aria-labelledby="role-dependencies">
              <div>
                <h3 id="role-dependencies" className="font-semibold">
                  Downstream use
                </h3>
                <p className="text-sm text-muted-foreground">
                  Referenced roles must be removed from these features before
                  unlinking.
                </p>
              </div>
              <dl className="grid gap-2 sm:grid-cols-2">
                {[
                  ["Events", eventDependencies],
                  ["Form sections", detail.dependencies.formSections],
                  ["Form response rules", detail.dependencies.formResponses],
                  ["Issues", detail.dependencies.issues],
                  [
                    "Issue visibility rules",
                    detail.dependencies.issueVisibility,
                  ],
                ].map(([label, count]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-background/60 px-3 py-2"
                  >
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className="font-mono text-sm font-medium">{count}</dd>
                  </div>
                ))}
              </dl>
              {eventBlockers.length > 0 && (
                <div className="grid gap-2 rounded-md border border-white/10 bg-background/60 p-3">
                  <h4 className="text-sm font-medium">Event references</h4>
                  {eventBlockers.map((blocker) =>
                    blocker.kind === "club" ? (
                      <Link
                        key={blocker.eventId}
                        href={`/admin/events?event=${blocker.eventId}`}
                        className="break-all text-sm text-primary underline-offset-4 hover:underline"
                      >
                        Open club event {blocker.eventId}
                      </Link>
                    ) : (
                      <p
                        key={blocker.eventId}
                        className="break-all text-sm text-muted-foreground"
                      >
                        Hackathon event {blocker.eventId} requires maintenance;
                        hackathon event editing is not available in Reforge yet.
                      </p>
                    ),
                  )}
                </div>
              )}
            </section>
          )}

          <div className="space-y-2">
            <div>
              <h3 className="font-semibold">Blade permissions</h3>
              <p className="text-sm text-muted-foreground">
                The Discord role link is immutable.
              </p>
            </div>
            <RolePermissionEditor
              selected={permissions}
              onChange={setPermissions}
            />
          </div>

          <div className="flex flex-col gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              disabled={detail.isMissing || sync.isPending}
              onClick={() => sync.mutate({ roleId: detail.id })}
            >
              {sync.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sync now
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="destructive"
                disabled={hasDependencies || !detail.canRemoveAdmin}
                onClick={() => setUnlinkOpen(true)}
              >
                <Trash2 className="h-4 w-4" /> Unlink role
              </Button>
              <Button
                type="button"
                disabled={!changed || detail.isMissing || update.isPending}
                onClick={() =>
                  update.mutate({ roleId: detail.id, permissions })
                }
              >
                {update.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Save permissions
              </Button>
            </div>
          </div>
          {(hasDependencies || !detail.canRemoveAdmin) && (
            <p className="text-sm text-muted-foreground">
              {hasDependencies
                ? "This role is still used by another Blade feature and cannot be unlinked."
                : "This is the final assigned role administrator and cannot be unlinked."}
            </p>
          )}
        </div>

        {unlinkOpen && (
          <div className="border-t border-destructive/30 bg-destructive/10 px-4 py-4 sm:px-6">
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold">Unlink {detail.name}?</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Blade assignments will be removed. The Discord role and its
                  Discord members will not change.
                </p>
              </div>
              <label className="block space-y-2 text-sm font-medium">
                <span>
                  Type{" "}
                  <span className="font-mono">{ROLE_UNLINK_CONFIRMATION}</span>
                </span>
                <Input
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  onPaste={(event) => event.preventDefault()}
                />
              </label>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUnlinkOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={
                    confirmation !== ROLE_UNLINK_CONFIRMATION ||
                    unlink.isPending
                  }
                  onClick={() =>
                    unlink.mutate({
                      confirmation: ROLE_UNLINK_CONFIRMATION,
                      roleId: detail.id,
                    })
                  }
                >
                  {unlink.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Unlink Blade role
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="border-t border-border/70 px-4 py-3 sm:px-6">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
