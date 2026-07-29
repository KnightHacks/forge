"use client";

import { useState } from "react";
import { Loader2, Pencil } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
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

import { api } from "~/trpc/react";
import { DiscordConfigDialog } from "./discord-config-dialog";

type DiscordConfig = RouterOutputs["discordConfig"]["list"];
type DiscordConfigRow = DiscordConfig["rows"][number];

/**
 * States the mechanism rather than the intention. Other Blade instances and
 * `apps/cron` read through a sixty-second per-process cache, and `apps/tk`
 * resolves the guild id once at module scope, so nothing here is "live
 * everywhere" at the moment an officer presses Save.
 */
const SAVE_TOAST =
  "Saved. Other Blade instances and the cron worker pick this up within about a minute. The T.K. bot reads the server ID once at startup and needs a restart.";

const KIND_HEADINGS: Record<DiscordConfigRow["kind"], string> = {
  channel: "Channels",
  guild: "Discord server",
  role: "Roles",
};

/**
 * Groups without sorting. A `Map` keeps insertion order, so both the group
 * order and the order inside a group are the server's — which is deliberately
 * not alphabetical, and which the client must not quietly start re-deriving.
 * Membership follows the `kind` column, never the key text.
 */
function groupByKind(rows: DiscordConfigRow[]) {
  const groups = new Map<DiscordConfigRow["kind"], DiscordConfigRow[]>();
  for (const row of rows) {
    const existing = groups.get(row.kind);
    if (existing) existing.push(row);
    else groups.set(row.kind, [row]);
  }
  return [...groups.entries()];
}

function UsageBadge({ row }: { row: DiscordConfigRow }) {
  const inert = row.readBy.length === 0;
  return (
    <Badge
      className={inert ? "border-dashed text-muted-foreground" : undefined}
      variant={inert ? "outline" : "default"}
    >
      {inert ? "Unused" : "In use"}
    </Badge>
  );
}

/**
 * The whole reason this column exists: ten of the fourteen keys are read by
 * nothing, and the `description` text reads identically for an inert row and a
 * live one. The badge carries the distinction, the list carries the stakes.
 */
function UsageDetail({ row }: { row: DiscordConfigRow }) {
  if (row.readBy.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing on the platform reads this setting. Editing it changes no
        behavior.
      </p>
    );
  }

  return (
    <ul className="space-y-0.5 text-sm text-muted-foreground">
      {row.readBy.map((consumer) => (
        <li key={consumer}>{consumer}</li>
      ))}
    </ul>
  );
}

function SnowflakeValue({ value }: { value: string | null }) {
  if (value === null) {
    return (
      <span className="text-sm text-muted-foreground">Reuses production</span>
    );
  }
  return <span className="font-mono text-sm">{value}</span>;
}

function EditButton({
  onClick,
  row,
  saving,
}: {
  onClick: () => void;
  row: DiscordConfigRow;
  saving: boolean;
}) {
  return (
    <Button
      aria-label={`Edit ${row.label}`}
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
      Edit
    </Button>
  );
}

export function DiscordConfigSection({
  environment,
  onSaved,
  rows,
}: {
  environment: DiscordConfig["environment"];
  onSaved: () => void;
  rows: DiscordConfigRow[];
}) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  // One mutation object is shared by all fourteen rows, so `isPending` would
  // spin every one of them. The pending row is tracked by its own key.
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const update = api.discordConfig.update.useMutation({
    onSuccess() {
      setSavingKey(null);
      setEditingKey(null);
      toast.success(SAVE_TOAST);
      onSaved();
    },
    onError(error) {
      // Cleared on failure too, or a failed save strands its row disabled.
      setSavingKey(null);
      toast.error(error.message || "The setting could not be saved.");
    },
  });

  const groups = groupByKind(rows);
  const editingRow = rows.find((row) => row.key === editingKey);

  return (
    <Card className="min-w-0 border-white/10 bg-card/95">
      <CardHeader className="gap-1 p-4 sm:p-6">
        <CardTitle>Discord configuration</CardTitle>
        <CardDescription>
          The snowflakes the bot, the crons and Blade resolve at runtime. This
          process resolves the {environment} column. Keys are added and removed
          by migration, never here.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="hidden overflow-x-auto md:block">
          {groups.map(([kind, kindRows]) => (
            <section
              aria-labelledby={`discord-config-table-${kind}`}
              key={kind}
              className="border-t border-border/70 first:border-t-0"
            >
              <h3
                className="px-4 pb-2 pt-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground sm:px-6"
                id={`discord-config-table-${kind}`}
              >
                {KIND_HEADINGS[kind]}
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Setting</TableHead>
                    <TableHead>Platform usage</TableHead>
                    <TableHead>Production ID</TableHead>
                    <TableHead>Development ID</TableHead>
                    <TableHead>Resolved here</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kindRows.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="min-w-64 align-top">
                        <div className="font-medium">{row.label}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {row.key}
                        </div>
                        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                          {row.description}
                        </p>
                      </TableCell>
                      <TableCell className="align-top">
                        <UsageBadge row={row} />
                        <div className="mt-1 max-w-56">
                          <UsageDetail row={row} />
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <SnowflakeValue value={row.productionId} />
                      </TableCell>
                      <TableCell className="align-top">
                        <SnowflakeValue value={row.developmentId} />
                      </TableCell>
                      <TableCell className="align-top">
                        <SnowflakeValue value={row.resolvedId} />
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex justify-end">
                          <EditButton
                            onClick={() => setEditingKey(row.key)}
                            row={row}
                            saving={savingKey === row.key}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          ))}
        </div>

        <div className="grid min-w-0 gap-2 p-2 sm:p-3 md:hidden">
          {groups.map(([kind, kindRows]) => (
            <section
              aria-labelledby={`discord-config-card-${kind}`}
              className="grid min-w-0 gap-2"
              key={kind}
            >
              <h3
                className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
                id={`discord-config-card-${kind}`}
              >
                {KIND_HEADINGS[kind]}
              </h3>
              {kindRows.map((row) => (
                <div
                  className="min-w-0 overflow-hidden rounded-md border border-white/10 bg-background/60 p-3"
                  key={row.key}
                >
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium">{row.label}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {row.key}
                      </div>
                    </div>
                    <UsageBadge row={row} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {row.description}
                  </p>
                  <div className="mt-2">
                    <UsageDetail row={row} />
                  </div>
                  <dl className="mt-3 grid gap-1 text-sm">
                    <div className="flex min-w-0 justify-between gap-2">
                      <dt className="text-muted-foreground">Production ID</dt>
                      <dd className="min-w-0 truncate">
                        <SnowflakeValue value={row.productionId} />
                      </dd>
                    </div>
                    <div className="flex min-w-0 justify-between gap-2">
                      <dt className="text-muted-foreground">Development ID</dt>
                      <dd className="min-w-0 truncate">
                        <SnowflakeValue value={row.developmentId} />
                      </dd>
                    </div>
                    <div className="flex min-w-0 justify-between gap-2">
                      <dt className="text-muted-foreground">Resolved here</dt>
                      <dd className="min-w-0 truncate">
                        <SnowflakeValue value={row.resolvedId} />
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-3">
                    <EditButton
                      onClick={() => setEditingKey(row.key)}
                      row={row}
                      saving={savingKey === row.key}
                    />
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      </CardContent>

      {editingRow && (
        <DiscordConfigDialog
          key={editingRow.key}
          onCancel={() => setEditingKey(null)}
          onSave={(draft, acknowledgeGuildRepoint) => {
            setSavingKey(editingRow.key);
            update.mutate({
              acknowledgeGuildRepoint,
              description: draft.description,
              developmentId: draft.developmentId,
              key: editingRow.key,
              label: draft.label,
              productionId: draft.productionId,
            });
          }}
          row={editingRow}
          saving={savingKey === editingRow.key}
        />
      )}
    </Card>
  );
}
