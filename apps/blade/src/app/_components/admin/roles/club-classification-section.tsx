"use client";

import { useState } from "react";
import { Loader2, Pencil, Tags } from "lucide-react";

import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@forge/ui/table";
import { toast } from "@forge/ui/toast";

import type { ClubRoleRow, ClubTeamRow } from "./club-classification-dialog";
import { api } from "~/trpc/react";
import { ClubClassificationDialog } from "./club-classification-dialog";

/**
 * Deliberately says nothing about propagation. `loadClubTeamConfig` queries on
 * every call and holds no cache, so a convergence warning copied over from the
 * Discord section would be a false one.
 */
const SAVE_TOAST = "Classification saved. The public roster reads it directly.";

const KIND_LABELS: Record<
  NonNullable<ClubRoleRow["classification"]>["kind"],
  string
> = {
  director: "Director",
  executive: "Executive",
  team: "Team member",
};

function teamLabel(teams: ClubTeamRow[], teamId: string | null) {
  if (teamId === null) return null;
  return teams.find((team) => team.id === teamId)?.label ?? null;
}

function ClassificationBadge({ role }: { role: ClubRoleRow }) {
  if (!role.classification) {
    return (
      <Badge className="border-dashed text-muted-foreground" variant="outline">
        Unclassified
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">{KIND_LABELS[role.classification.kind]}</Badge>
  );
}

/**
 * Shows the value the roster renders today, and marks whether it came from an
 * override or from the fallback. A blank override does not mean the same thing
 * for every kind, and an officer who cannot see what blank produces fills the
 * field in defensively.
 */
function LabelValue({
  overridden,
  resolved,
}: {
  overridden: boolean;
  resolved: string | null;
}) {
  if (resolved === null)
    return <span className="text-muted-foreground">—</span>;
  return (
    <span className="min-w-0">
      {resolved}
      {overridden ? null : (
        <span className="ml-1 text-xs text-muted-foreground">(fallback)</span>
      )}
    </span>
  );
}

function ClassifyButton({
  onClick,
  role,
  saving,
}: {
  onClick: () => void;
  role: ClubRoleRow;
  saving: boolean;
}) {
  return (
    <Button
      aria-label={
        role.classification
          ? `Edit classification for ${role.roleName}`
          : `Classify ${role.roleName}`
      }
      className="min-h-11 gap-2"
      disabled={saving}
      onClick={onClick}
      size="sm"
      type="button"
      variant="outline"
    >
      {saving ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Pencil aria-hidden="true" className="h-4 w-4" />
      )}
      {role.classification ? "Edit" : "Classify"}
    </Button>
  );
}

export function ClubClassificationSection({
  onSaved,
  roles,
  teams,
}: {
  onSaved: () => void;
  roles: ClubRoleRow[];
  teams: ClubTeamRow[];
}) {
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  // Same reason as the Discord section: one mutation object serves every row,
  // so `isPending` alone would spin all of them.
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const update = api.clubTeams.updateClassification.useMutation({
    onSuccess() {
      setSavingRoleId(null);
      setEditingRoleId(null);
      toast.success(SAVE_TOAST);
      onSaved();
    },
    onError(error) {
      setSavingRoleId(null);
      toast.error(error.message || "The classification could not be saved.");
    },
  });

  const editingRole = roles.find((role) => role.roleId === editingRoleId);

  return (
    <section className="min-w-0 space-y-4">
      <Card className="min-w-0 border-white/10 bg-card/95">
        <CardHeader className="gap-1 p-4 sm:p-6">
          <CardTitle>Club teams</CardTitle>
          <CardDescription>
            The tabs the public Club site renders, shown as context. Adding,
            renaming and reordering teams stays a migration: the display order
            carries a non-deferrable unique index, and deleting a bucket empties
            it on the public site without an error.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Heading</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Display order</TableHead>
                  <TableHead>Classified roles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium">{team.label}</TableCell>
                    <TableCell>{team.heading}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {team.slug}
                    </TableCell>
                    <TableCell>{KIND_LABELS[team.kind]}</TableCell>
                    <TableCell>{team.displayOrder}</TableCell>
                    <TableCell>{team.classifiedRoleCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid min-w-0 gap-2 p-2 sm:p-3 md:hidden">
            {teams.map((team) => (
              <div
                className="min-w-0 overflow-hidden rounded-md border border-white/10 bg-background/60 p-3"
                key={team.id}
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium">{team.label}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {team.slug}
                    </div>
                  </div>
                  <Badge variant="outline">{KIND_LABELS[team.kind]}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {team.heading}
                </p>
                <dl className="mt-2 grid gap-1 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Display order</dt>
                    <dd>{team.displayOrder}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Classified roles</dt>
                    <dd>{team.classifiedRoleCount}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 border-white/10 bg-card/95">
        <CardHeader className="gap-1 p-4 sm:p-6">
          <CardTitle>Club roster classification</CardTitle>
          <CardDescription>
            How each Blade role appears on the public roster and on a Guild
            profile. A role with no classification appears nowhere until it is
            given one here — no script run, no deploy.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Rank</TableHead>
                  <TableHead>Roster card</TableHead>
                  <TableHead>Guild badge</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.roleId}>
                    <TableCell className="min-w-56 font-medium">
                      {role.roleName}
                    </TableCell>
                    <TableCell>
                      <ClassificationBadge role={role} />
                    </TableCell>
                    <TableCell>
                      {teamLabel(
                        teams,
                        role.classification?.teamId ?? null,
                      ) ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {role.classification?.rank ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <LabelValue
                        overridden={
                          typeof role.classification?.rosterLabel === "string"
                        }
                        resolved={role.resolvedRosterLabel}
                      />
                    </TableCell>
                    <TableCell>
                      <LabelValue
                        overridden={
                          typeof role.classification?.calloutLabel === "string"
                        }
                        resolved={role.resolvedCalloutLabel}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <ClassifyButton
                          onClick={() => setEditingRoleId(role.roleId)}
                          role={role}
                          saving={savingRoleId === role.roleId}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid min-w-0 gap-2 p-2 sm:p-3 md:hidden">
            {roles.map((role) => (
              <div
                className="min-w-0 overflow-hidden rounded-md border border-white/10 bg-background/60 p-3"
                key={role.roleId}
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0 font-medium">{role.roleName}</div>
                  <ClassificationBadge role={role} />
                </div>
                <dl className="mt-2 grid gap-1 text-sm">
                  <div className="flex min-w-0 justify-between gap-2">
                    <dt className="text-muted-foreground">Team</dt>
                    <dd className="min-w-0 truncate">
                      {teamLabel(teams, role.classification?.teamId ?? null) ??
                        "—"}
                    </dd>
                  </div>
                  <div className="flex min-w-0 justify-between gap-2">
                    <dt className="text-muted-foreground">Rank</dt>
                    <dd>{role.classification?.rank ?? "—"}</dd>
                  </div>
                  <div className="flex min-w-0 justify-between gap-2">
                    <dt className="text-muted-foreground">Roster card</dt>
                    <dd className="min-w-0 truncate">
                      <LabelValue
                        overridden={
                          typeof role.classification?.rosterLabel === "string"
                        }
                        resolved={role.resolvedRosterLabel}
                      />
                    </dd>
                  </div>
                  <div className="flex min-w-0 justify-between gap-2">
                    <dt className="text-muted-foreground">Guild badge</dt>
                    <dd className="min-w-0 truncate">
                      <LabelValue
                        overridden={
                          typeof role.classification?.calloutLabel === "string"
                        }
                        resolved={role.resolvedCalloutLabel}
                      />
                    </dd>
                  </div>
                </dl>
                <div className="mt-3">
                  <ClassifyButton
                    onClick={() => setEditingRoleId(role.roleId)}
                    role={role}
                    saving={savingRoleId === role.roleId}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-border/70 px-4 py-3 text-sm text-muted-foreground sm:px-6">
            <Tags aria-hidden="true" className="h-4 w-4 shrink-0" />
            {roles.filter((role) => role.classification).length} of{" "}
            {roles.length} linked roles are classified.
          </div>
        </CardContent>
      </Card>

      {editingRole && (
        <ClubClassificationDialog
          key={editingRole.roleId}
          onCancel={() => setEditingRoleId(null)}
          onSave={(draft) => {
            setSavingRoleId(editingRole.roleId);
            update.mutate({
              calloutLabel: draft.calloutLabel,
              kind: draft.kind,
              rank: draft.rank,
              roleId: editingRole.roleId,
              rosterLabel: draft.rosterLabel,
              teamId: draft.teamId,
            });
          }}
          role={editingRole}
          saving={savingRoleId === editingRole.roleId}
          teams={teams}
        />
      )}
    </section>
  );
}
