import {
  Activity,
  Archive,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  Layers3,
  MessageSquareText,
  Radio,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Badge } from "@forge/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@forge/ui/table";

import {
  adminPageClassName,
  AdminPageHeader,
} from "~/app/_components/shared/admin-page";
import { ADMIN_PAGE_EYEBROWS } from "~/consts/admin-page-eyebrows";
import { formatClubDateTime } from "~/lib/dates";

type DiscordArchiveHealth = RouterOutputs["discordArchive"]["getHealth"];

const numberFormatter = new Intl.NumberFormat("en-US");

function formatDate(value: Date | null) {
  return formatClubDateTime(value, "Not recorded");
}

function formatLag(seconds: number | null) {
  if (seconds === null) return "No signal";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3_600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3_600)}h ago`;
  return `${Math.floor(seconds / 86_400)}d ago`;
}

function formatPercent(value: number | null) {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

function channelTypeLabel(type: number, isThread: boolean) {
  if (isThread) {
    if (type === 12) return "Private thread";
    if (type === 10) return "Announcement thread";
    return "Public thread";
  }
  const labels: Record<number, string> = {
    0: "Text channel",
    2: "Voice channel",
    5: "Announcement channel",
    13: "Stage channel",
    15: "Forum channel",
    16: "Media channel",
  };
  return labels[type] ?? `Discord surface · type ${type}`;
}

function Stat({
  detail,
  icon: Icon,
  label,
  value,
}: {
  detail: string;
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-card/95 p-3 shadow-xl shadow-black/10">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
      </div>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

function PulseRow({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="grid gap-1 border-b border-border/60 py-2 last:border-0 sm:grid-cols-[minmax(10rem,0.8fr)_minmax(0,1.2fr)] sm:items-center">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      <p className="text-sm tabular-nums text-muted-foreground sm:text-right">
        {value}
      </p>
    </div>
  );
}

export function DiscordArchiveHealthDashboard({
  health,
}: {
  health: DiscordArchiveHealth;
}) {
  const healthy =
    health.ingestion.status === "healthy" &&
    health.checkpoints.failedCount === 0;
  return (
    <main
      className={`${adminPageClassName} min-h-0 space-y-3 lg:flex lg:h-[calc(100svh-4rem)] lg:flex-col lg:overflow-hidden lg:pb-4`}
    >
      <AdminPageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {healthy ? (
                <CheckCircle2
                  className="mr-1 size-3.5 text-emerald-500"
                  aria-hidden="true"
                />
              ) : (
                <TriangleAlert
                  className="mr-1 size-3.5 text-amber-500"
                  aria-hidden="true"
                />
              )}
              {health.ingestion.status}
            </Badge>
            <Badge variant="outline">
              Generated {formatDate(health.generatedAt)}
            </Badge>
          </div>
        }
        description="Read-only ingestion health for the configured Discord guild. This view exposes operational aggregates and channel metadata, never archived message bodies."
        eyebrow={ADMIN_PAGE_EYEBROWS.discordArchive}
        icon={DatabaseZap}
        title="Discord archive health"
        titleClassName="text-2xl sm:text-3xl md:text-3xl"
      />

      <section
        aria-label="Archive status"
        className="flex flex-col gap-3 rounded-lg border border-border/70 bg-card/95 p-3 shadow-2xl shadow-black/15 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <div
            className={`grid size-9 shrink-0 place-items-center rounded-md ${
              healthy
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-amber-500/10 text-amber-500"
            }`}
          >
            {healthy ? (
              <ShieldCheck className="size-5" aria-hidden="true" />
            ) : (
              <TriangleAlert className="size-5" aria-hidden="true" />
            )}
          </div>
          <div>
            <h2 className="font-semibold">
              {healthy
                ? "Archive services are reporting healthy"
                : "Archive services need attention"}
            </h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {health.checkpoints.completeCount} of{" "}
              {health.surfaces.surfaceCount} visible surfaces have complete
              historical checkpoints.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Radio className="size-4 text-primary" aria-hidden="true" />
          Gateway {formatLag(health.ingestion.gatewayLagSeconds)}
        </div>
      </section>

      <section
        aria-label="Archive totals"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <Stat
          detail="Current-state records retained after edits and deletions."
          icon={MessageSquareText}
          label="Current messages"
          value={numberFormatter.format(health.messages.currentMessageCount)}
        />
        <Stat
          detail={`${health.surfaces.channelCount} channels · ${health.surfaces.threadCount} threads`}
          icon={Layers3}
          label="Visible surfaces"
          value={numberFormatter.format(health.surfaces.surfaceCount)}
        />
        <Stat
          detail={`${health.checkpoints.completeCount} complete · ${health.checkpoints.failedCount} failed`}
          icon={Archive}
          label="Backfill coverage"
          value={formatPercent(health.checkpoints.coverage)}
        />
        <Stat
          detail="Deleted records are purged and retained only as empty tombstones."
          icon={Trash2}
          label="Tombstones"
          value={numberFormatter.format(health.messages.tombstonedMessageCount)}
        />
      </section>

      <section className="grid min-h-0 min-w-0 gap-3 lg:flex-1 lg:overflow-hidden xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-border/70 bg-card/95 shadow-2xl shadow-black/15">
          <div className="border-b border-border/70 px-3 py-2.5 sm:px-4">
            <h2 className="font-semibold">Surface coverage</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Checkpoint state and safe operational errors by Discord surface.
              Message text is intentionally unavailable.
            </p>
          </div>
          <div
            aria-label="Discord archive surface coverage"
            className="max-h-[20rem] min-h-0 max-w-full flex-1 overflow-auto lg:max-h-none"
            role="region"
            tabIndex={0}
          >
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead>Surface</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Processed</TableHead>
                  <TableHead>Last reconciled</TableHead>
                  <TableHead>Signal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {health.rows.map((row) => (
                  <TableRow key={row.channelId}>
                    <TableCell>
                      <p className="max-w-64 truncate font-medium">
                        {row.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {channelTypeLabel(row.type, row.isThread)}
                        {row.archived ? " · archived" : ""}
                        {row.isPrivateThread ? " · private" : ""}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.backfillStatus}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {numberFormatter.format(row.processedMessageCount)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(row.lastReconciledAt)}
                    </TableCell>
                    <TableCell>
                      {row.lastErrorCode ? (
                        <span className="text-sm text-amber-500">
                          {row.lastErrorCode}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Clear
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {health.nextCursor ? (
            <p className="border-t border-border/70 px-3 py-2 text-xs text-muted-foreground">
              Showing the newest {health.rows.length} surfaces. Additional
              results are available through the paginated health API.
            </p>
          ) : null}
        </div>

        <aside className="min-h-0 overflow-y-auto rounded-lg border border-border/70 bg-card/95 p-3 shadow-xl shadow-black/10">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-primary" aria-hidden="true" />
            <h2 className="font-semibold">Service pulse</h2>
          </div>
          <div className="mt-3">
            <PulseRow
              detail="Most recent accepted Gateway event"
              label="Live listener"
              value={formatDate(health.ingestion.lastGatewayEventAt)}
            />
            <PulseRow
              detail="Latest completed channel discovery"
              label="Discovery"
              value={formatDate(health.ingestion.lastDiscoveryCompletedAt)}
            />
            <PulseRow
              detail={`${formatLag(health.ingestion.reconciliationLagSeconds)}`}
              label="Reconciliation"
              value={formatDate(health.ingestion.lastReconciliationCompletedAt)}
            />
            <PulseRow
              detail="Most recent historical page committed"
              label="Backfill"
              value={formatDate(health.ingestion.lastBackfillProgressAt)}
            />
          </div>
          <div className="mt-3 rounded-md border border-border/60 bg-muted/15 p-2.5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock3 className="size-4 text-primary" aria-hidden="true" />
              Lease
            </div>
            <p className="mt-1.5 text-sm leading-5 text-muted-foreground">
              {health.ingestion.leaseActive
                ? `A worker lease is active through ${formatDate(
                    health.ingestion.leaseExpiresAt,
                  )}.`
                : "No worker currently holds the archive lease."}
            </p>
          </div>
          {health.ingestion.lastErrorCode ? (
            <div className="mt-3 rounded-md border border-amber-500/25 bg-amber-500/5 p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-amber-500">
                <TriangleAlert className="size-4" aria-hidden="true" />
                Safe error signal
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {health.ingestion.lastErrorCode}
              </p>
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
