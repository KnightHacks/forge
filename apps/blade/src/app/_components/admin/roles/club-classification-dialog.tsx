"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { TEAM } from "@forge/consts";
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
import { Label } from "@forge/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";

type ClubConfiguration = RouterOutputs["clubTeams"]["listConfiguration"];
export type ClubRoleRow = ClubConfiguration["roles"][number];
export type ClubTeamRow = ClubConfiguration["teams"][number];

export interface ClubClassificationDraft {
  calloutLabel: string;
  kind: TEAM.ClubTeamKind;
  rank: number;
  rosterLabel: string;
  teamId: string | null;
}

/** Radix `Select` cannot hold `""` as a value, so "no team" needs a sentinel. */
const NO_TEAM = "none";

const KIND_LABELS: Record<TEAM.ClubTeamKind, string> = {
  director: "Director",
  executive: "Executive",
  team: "Team member",
};

function seed(role: ClubRoleRow): ClubClassificationDraft {
  return {
    calloutLabel: role.classification?.calloutLabel ?? "",
    kind: role.classification?.kind ?? "team",
    rank: role.classification?.rank ?? 100,
    rosterLabel: role.classification?.rosterLabel ?? "",
    teamId: role.classification?.teamId ?? null,
  };
}

export function ClubClassificationDialog({
  onCancel,
  onSave,
  role,
  saving,
  teams,
}: {
  onCancel: () => void;
  onSave: (draft: ClubClassificationDraft) => void;
  role: ClubRoleRow;
  saving: boolean;
  teams: ClubTeamRow[];
}) {
  const [draft, setDraft] = useState<ClubClassificationDraft>(() => seed(role));
  const update = (patch: Partial<ClubClassificationDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const original = seed(role);
  const dirty =
    role.classification === null ||
    draft.kind !== original.kind ||
    draft.rank !== original.rank ||
    draft.teamId !== original.teamId ||
    draft.rosterLabel !== original.rosterLabel ||
    draft.calloutLabel !== original.calloutLabel;
  // Mirrors `knight_hacks_club_team_role_team_check`. A team classification
  // with no team resolves to no roster bucket at all, so its holders vanish
  // from the public site with no error anywhere.
  const missingTeam = draft.kind === "team" && draft.teamId === null;
  const rankValid = Number.isInteger(draft.rank) && draft.rank >= 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="flex max-h-[90svh] max-w-2xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b border-border/70 px-5 py-4 text-left">
          <DialogTitle>
            {role.classification
              ? `Classification for ${role.roleName}`
              : `Classify ${role.roleName}`}
          </DialogTitle>
          <DialogDescription>
            Decides where holders of this role appear on the public Club roster
            and which badge their Guild profile shows.
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 gap-4 overflow-y-auto px-5 py-4">
          <div className="grid gap-2">
            <Label htmlFor="club-classification-kind">Kind</Label>
            <Select
              onValueChange={(value) =>
                update({ kind: value as TEAM.ClubTeamKind })
              }
              value={draft.kind}
            >
              <SelectTrigger className="h-11" id="club-classification-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEAM.CLUB_TEAM_KINDS.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {KIND_LABELS[kind]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="club-classification-team">Team</Label>
            <Select
              onValueChange={(value) =>
                update({ teamId: value === NO_TEAM ? null : value })
              }
              value={draft.teamId ?? NO_TEAM}
            >
              <SelectTrigger className="h-11" id="club-classification-team">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {/*
                  Existing teams only. Teams are read-only in this console —
                  `displayOrder` carries a non-deferrable unique index and
                  deleting the executive row silently empties a public bucket.
                */}
                <SelectItem value={NO_TEAM}>No team</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm leading-5 text-muted-foreground">
              {missingTeam
                ? "A team classification must name a team. Without one it resolves to no roster bucket and its holders vanish from the public site."
                : "An executive or director that names a team also leads it, appearing at the top of that team as well as in its own tier."}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="club-classification-rank">Rank</Label>
            <Input
              className="h-11"
              id="club-classification-rank"
              inputMode="numeric"
              min={0}
              onChange={(event) => update({ rank: event.target.valueAsNumber })}
              type="number"
              value={Number.isNaN(draft.rank) ? "" : draft.rank}
            />
            <p className="text-sm leading-5 text-muted-foreground">
              Sort position inside this role&rsquo;s bucket, lowest first. The
              Guild profile badge follows the team&rsquo;s tab order, not this
              number.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="club-classification-roster-label">
              Roster label override
            </Label>
            <Input
              className="h-11"
              id="club-classification-roster-label"
              onChange={(event) => update({ rosterLabel: event.target.value })}
              value={draft.rosterLabel}
            />
            <p className="text-sm leading-5 text-muted-foreground">
              Empty falls back to{" "}
              {draft.kind === "team"
                ? "the team's label"
                : "the role's own name"}
              . Changing it never affects the Guild profile badge.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="club-classification-callout-label">
              Guild badge override
            </Label>
            <Input
              className="h-11"
              id="club-classification-callout-label"
              onChange={(event) => update({ calloutLabel: event.target.value })}
              value={draft.calloutLabel}
            />
            <p className="text-sm leading-5 text-muted-foreground">
              Empty falls back to{" "}
              {draft.kind === "team"
                ? "the team's label followed by “Team”"
                : "the role's own name"}
              . Changing it never affects the roster card.
            </p>
          </div>
        </div>
        <DialogFooter className="border-t border-border/70 px-5 py-4">
          <Button
            className="min-h-11"
            disabled={saving}
            onClick={onCancel}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            className="min-h-11 gap-2"
            disabled={!dirty || missingTeam || !rankValid || saving}
            onClick={() => onSave(draft)}
            type="button"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save aria-hidden="true" className="h-4 w-4" />
            )}
            Save classification
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
