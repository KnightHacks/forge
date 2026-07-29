"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Save } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
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
import { Textarea } from "@forge/ui/textarea";

export type DiscordConfigRow =
  RouterOutputs["discordConfig"]["list"]["rows"][number];

export interface DiscordConfigDraft {
  description: string;
  developmentId: string;
  label: string;
  productionId: string;
}

function seed(row: DiscordConfigRow): DiscordConfigDraft {
  return {
    description: row.description,
    // The column is nullable and `NULL` means "reuse the production id". An
    // `<Input>` cannot hold null, so the draft carries `""` and the validator
    // coerces it back on the way in.
    developmentId: row.developmentId ?? "",
    label: row.label,
    productionId: row.productionId,
  };
}

export function DiscordConfigDialog({
  onCancel,
  onSave,
  row,
  saving,
}: {
  onCancel: () => void;
  onSave: (draft: DiscordConfigDraft, acknowledgeGuildRepoint: boolean) => void;
  row: DiscordConfigRow;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<DiscordConfigDraft>(() => seed(row));
  const [confirmingRepoint, setConfirmingRepoint] = useState(false);
  const update = (patch: Partial<DiscordConfigDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const original = seed(row);
  const dirty =
    draft.label !== original.label ||
    draft.description !== original.description ||
    draft.productionId !== original.productionId ||
    draft.developmentId !== original.developmentId;
  // `label` and `description` are `notNull` with no fallback behind them, so
  // blank is a mistake rather than a meaning. Disabling Save here means schema
  // rejection is not the first feedback an officer gets.
  const complete = draft.label.trim() !== "" && draft.description.trim() !== "";
  // Only a snowflake change repoints anything. Relabelling the guild row
  // changes nothing any consumer resolves, so it saves like every other row.
  const repointsGuild =
    row.key === "guild" &&
    (draft.productionId !== original.productionId ||
      draft.developmentId !== original.developmentId);

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="flex max-h-[90svh] max-w-2xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b border-border/70 px-5 py-4 text-left">
          <DialogTitle>Edit {row.label}</DialogTitle>
          <DialogDescription>
            The key <code>{row.key}</code> is read from code by name and cannot
            be changed here.
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 gap-4 overflow-y-auto px-5 py-4">
          <div className="grid gap-2">
            <Label htmlFor="discord-config-label">Label</Label>
            <Input
              className="h-11"
              id="discord-config-label"
              onChange={(event) => update({ label: event.target.value })}
              value={draft.label}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="discord-config-description">Description</Label>
            <Textarea
              className="min-h-24"
              id="discord-config-description"
              onChange={(event) => update({ description: event.target.value })}
              value={draft.description}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="discord-config-production">Production ID</Label>
            <Input
              className="h-11"
              id="discord-config-production"
              inputMode="numeric"
              onChange={(event) => update({ productionId: event.target.value })}
              value={draft.productionId}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="discord-config-development">Development ID</Label>
            <Input
              className="h-11"
              id="discord-config-development"
              inputMode="numeric"
              onChange={(event) =>
                update({ developmentId: event.target.value })
              }
              value={draft.developmentId}
            />
            <p className="text-sm leading-5 text-muted-foreground">
              Leave this empty to reuse the production ID outside production.
            </p>
          </div>
        </div>

        {/*
          An inline confirmation step rather than a nested `<Dialog>`, matching
          the unlink confirmation in `role-detail-dialog.tsx`. Cancelling it
          leaves `draft` untouched, so the edit survives.
        */}
        {confirmingRepoint && (
          <section
            aria-labelledby="discord-config-repoint"
            className="space-y-3 border-t border-destructive/30 bg-destructive/10 px-5 py-4"
          >
            <div>
              <h3
                className="flex items-center gap-2 font-semibold"
                id="discord-config-repoint"
              >
                <AlertTriangle
                  aria-hidden="true"
                  className="h-5 w-5 text-destructive"
                />
                Repoint the Discord server?
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Saving this ID sends every one of these at a different Discord
                server. The T.K. bot keeps using the old one until it restarts.
              </p>
            </div>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {/*
                Rendered from `readBy`, which the server joins on from
                `CONFIG_KEY_CONSUMERS`. A second hard-coded list here is exactly
                how the two would drift.
              */}
              {row.readBy.map((consumer) => (
                <li key={consumer}>{consumer}</li>
              ))}
            </ul>
            <div className="flex justify-end gap-2">
              <Button
                className="min-h-11"
                onClick={() => setConfirmingRepoint(false)}
                type="button"
                variant="outline"
              >
                Keep the current server
              </Button>
              <Button
                className="min-h-11 gap-2"
                disabled={saving}
                onClick={() => onSave(draft, true)}
                type="button"
                variant="destructive"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Repoint the server
              </Button>
            </div>
          </section>
        )}

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
            disabled={!dirty || !complete || saving || confirmingRepoint}
            onClick={() => {
              if (repointsGuild) {
                setConfirmingRepoint(true);
                return;
              }
              onSave(draft, false);
            }}
            type="button"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save aria-hidden="true" className="h-4 w-4" />
            )}
            Save setting
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
