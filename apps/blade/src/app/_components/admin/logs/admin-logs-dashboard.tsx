"use client";

import type { CSSProperties } from "react";
import { useDeferredValue, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ScrollText,
  Search,
} from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import type {
  AuditActionKey,
  AuditOutcome,
  AuditTargetType,
} from "@forge/validators";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { ResponsiveComboBox } from "@forge/ui/responsive-combo-box";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@forge/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@forge/ui/table";
import {
  AUDIT_ACTION_CATALOG,
  AUDIT_ACTION_KEYS,
  AUDIT_TARGET_TYPES,
} from "@forge/validators";

import {
  AdminPageHeader,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";
import { ADMIN_PAGE_EYEBROWS } from "~/consts/admin-page-eyebrows";
import { formatClubDateTime } from "~/lib/dates";
import { api } from "~/trpc/react";

type AuditEvent = RouterOutputs["audit"]["list"]["items"][number];
type AuditMember = RouterOutputs["audit"]["searchMembers"][number];
type AuditDetail = RouterOutputs["audit"]["detail"];

interface Cursor {
  id: string;
  occurredAt: Date;
}

const ALL = "__all__";

function memberLabel(member: AuditMember) {
  return `${member.firstName} ${member.lastName}`.trim();
}

function formatTimestamp(value: Date) {
  return formatClubDateTime(value);
}

function formatAuditValue(value: unknown) {
  if (value === null) return "None";
  if (value === undefined) return "—";
  if (Array.isArray(value)) return value.join(", ") || "None";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toLocaleString();
  return JSON.stringify(value);
}

function actorStyle(roleColor: string | null): CSSProperties | undefined {
  if (!roleColor) return undefined;
  return {
    "--actor-role-color": roleColor,
    color: roleColor,
  } as CSSProperties;
}

function OutcomeBadge({ outcome }: { outcome: AuditOutcome }) {
  return outcome === "partial_external" ? (
    <Badge
      variant="outline"
      className="border-amber-400/40 bg-amber-400/10 text-amber-200"
    >
      Partial
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="border-emerald-400/35 bg-emerald-400/10 text-emerald-200"
    >
      Committed
    </Badge>
  );
}

function DetailSheet({
  eventId,
  onOpenChange,
}: {
  eventId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const detail = api.audit.detail.useQuery(
    { eventId: eventId ?? "00000000-0000-4000-8000-000000000000" },
    { enabled: Boolean(eventId) },
  );

  return (
    <Sheet open={Boolean(eventId)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full border-white/10 bg-card sm:max-w-xl">
        {detail.isPending ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Loading audit detail…
          </div>
        ) : detail.error ? (
          <div className="flex gap-3 rounded-md border border-destructive/35 bg-destructive/10 p-4 text-sm text-destructive-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {detail.error.message}
          </div>
        ) : eventId ? (
          <AuditDetailContent detail={detail.data} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function AuditDetailContent({ detail }: { detail: AuditDetail }) {
  const primary = detail.subjects.find(
    (subject) => subject.relation === "primary",
  );
  const secondary = detail.subjects.filter(
    (subject) => subject.relation === "secondary",
  );
  const results = detail.subjects.filter(
    (subject) => subject.relation === "result",
  );

  return (
    <div className="space-y-6">
      <SheetHeader className="pr-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{detail.domain}</Badge>
          <OutcomeBadge outcome={detail.outcome} />
        </div>
        <SheetTitle>{detail.actionLabel}</SheetTitle>
        <SheetDescription>
          {formatTimestamp(detail.occurredAt)}
        </SheetDescription>
      </SheetHeader>

      <section className="grid gap-3 rounded-lg border border-white/10 bg-background/55 p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Actor
          </p>
          <p
            className="mt-1 font-semibold"
            style={actorStyle(detail.actorRoleColor)}
            title={detail.actorRoleLabel ?? undefined}
          >
            {detail.actorLabel}
          </p>
          {detail.actorRoleLabel ? (
            <p className="text-xs text-muted-foreground">
              {detail.actorRoleLabel}
            </p>
          ) : null}
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Target
          </p>
          <p className="mt-1 font-medium">
            {primary?.targetLabel ?? "Unknown"}
          </p>
          <p className="break-all font-mono text-xs text-muted-foreground">
            {primary?.targetType}:{primary?.targetId}
          </p>
        </div>
      </section>

      {detail.changes.length > 0 ? (
        <section>
          <h3 className="text-sm font-semibold">Changed fields</h3>
          <div className="mt-3 grid gap-2">
            {detail.changes.map((change) => (
              <div
                key={change.field}
                className="rounded-md border border-white/10 bg-background/40 p-3"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {change.field}
                </p>
                <div className="mt-2 grid gap-2 text-sm sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <span className="break-words">
                    {formatAuditValue(change.before)}
                  </span>
                  <span aria-hidden="true" className="text-muted-foreground">
                    →
                  </span>
                  <span className="break-words font-medium">
                    {formatAuditValue(change.after)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {Object.keys(detail.metadata).length > 0 ? (
        <section>
          <h3 className="text-sm font-semibold">Details</h3>
          <dl className="mt-3 grid gap-2 rounded-md border border-white/10 bg-background/40 p-3 text-sm">
            {Object.entries(detail.metadata).map(([key, value]) => (
              <div
                key={key}
                className="grid gap-1 sm:grid-cols-[10rem_minmax(0,1fr)]"
              >
                <dt className="text-muted-foreground">{key}</dt>
                <dd className="break-words">{formatAuditValue(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {secondary.length > 0 ? (
        <section>
          <h3 className="text-sm font-semibold">Related objects</h3>
          <div className="mt-3 grid gap-2">
            {secondary.map((subject) => (
              <div
                key={subject.id}
                className="rounded-md border border-white/10 bg-background/40 p-3"
              >
                <p className="font-medium">{subject.targetLabel}</p>
                <p className="break-all font-mono text-xs text-muted-foreground">
                  {subject.targetType}:{subject.targetId}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {results.length > 0 ? (
        <section>
          <h3 className="text-sm font-semibold">Results ({results.length})</h3>
          <div className="mt-3 grid gap-2">
            {results.map((subject) => (
              <div
                key={subject.id}
                className="flex items-start justify-between gap-3 rounded-md border border-white/10 bg-background/40 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{subject.targetLabel}</p>
                  <p className="break-all font-mono text-xs text-muted-foreground">
                    {subject.targetType}:{subject.targetId}
                  </p>
                </div>
                <Badge variant="outline">
                  {subject.resultOutcome?.replaceAll("_", " ")}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function EventRow({
  event,
  onSelect,
}: {
  event: AuditEvent;
  onSelect: (id: string) => void;
}) {
  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => onSelect(event.id)}
      onKeyDown={(keyboardEvent) => {
        if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
          keyboardEvent.preventDefault();
          onSelect(event.id);
        }
      }}
      tabIndex={0}
    >
      <TableCell className="whitespace-nowrap text-muted-foreground">
        {formatTimestamp(event.occurredAt)}
      </TableCell>
      <TableCell>
        <p
          className="font-semibold"
          style={actorStyle(event.actor.roleColor)}
          title={event.actor.roleLabel ?? undefined}
        >
          {event.actor.label}
        </p>
        {event.actor.roleLabel ? (
          <p className="text-xs text-muted-foreground">
            {event.actor.roleLabel}
          </p>
        ) : null}
      </TableCell>
      <TableCell>
        <p className="font-medium">{event.actionLabel}</p>
        <p className="font-mono text-xs text-muted-foreground">
          {event.actionKey}
        </p>
      </TableCell>
      <TableCell>
        <p className="max-w-64 truncate font-medium">
          {event.primaryTarget?.label ?? "Unknown target"}
        </p>
        <p className="text-xs text-muted-foreground">
          {event.primaryTarget?.type ?? "unknown"}
          {event.resultCount > 0 ? ` · ${event.resultCount} results` : ""}
        </p>
      </TableCell>
      <TableCell>
        <OutcomeBadge outcome={event.outcome} />
      </TableCell>
    </TableRow>
  );
}

export function AdminLogsDashboard({
  events,
  members,
}: {
  events: RouterOutputs["audit"]["list"];
  members: RouterOutputs["audit"]["searchMembers"];
}) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [memberSearch, setMemberSearch] = useState("");
  const deferredMemberSearch = useDeferredValue(memberSearch.trim());
  const [memberId, setMemberId] = useState<string | null>(null);
  const [actorUserId, setActorUserId] = useState<string | null>(null);
  const [actionKey, setActionKey] = useState<AuditActionKey | null>(null);
  const [targetType, setTargetType] = useState<AuditTargetType | null>(null);
  const [outcome, setOutcome] = useState<AuditOutcome | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [cursorStack, setCursorStack] = useState<(Cursor | undefined)[]>([
    undefined,
  ]);
  const [page, setPage] = useState(0);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const queryInput = useMemo(
    () => ({
      ...(actionKey ? { actionKeys: [actionKey] } : {}),
      ...(actorUserId ? { actorUserId } : {}),
      cursor: cursorStack[page],
      ...(from ? { from: new Date(`${from}T00:00:00`) } : {}),
      limit: 50,
      ...(memberId ? { memberId } : {}),
      ...(outcome ? { outcomes: [outcome] } : {}),
      ...(deferredSearch ? { search: deferredSearch } : {}),
      ...(targetType ? { targetTypes: [targetType] } : {}),
      ...(to ? { to: new Date(`${to}T23:59:59.999`) } : {}),
    }),
    [
      actionKey,
      actorUserId,
      cursorStack,
      deferredSearch,
      from,
      memberId,
      outcome,
      page,
      targetType,
      to,
    ],
  );
  const isDefaultEventQuery =
    !actionKey &&
    !actorUserId &&
    !cursorStack[page] &&
    !deferredSearch &&
    !from &&
    !memberId &&
    !outcome &&
    !targetType &&
    !to;
  // The server read covers the unfiltered first page. Anything else is driven
  // by client state, so only those inputs reach the network.
  const filteredEvents = api.audit.list.useQuery(queryInput, {
    enabled: !isDefaultEventQuery,
    placeholderData: (previous) => previous ?? events,
  });
  const matchingMembers = api.audit.searchMembers.useQuery(
    {
      limit: 20,
      search: deferredMemberSearch,
    },
    { enabled: Boolean(deferredMemberSearch) },
  );
  const eventPage = isDefaultEventQuery ? events : filteredEvents.data;
  const eventsError = isDefaultEventQuery ? null : filteredEvents.error;
  const eventsFetching = !isDefaultEventQuery && filteredEvents.isFetching;
  const memberOptions = deferredMemberSearch
    ? (matchingMembers.data ?? [])
    : members;
  const memberOptionsPending =
    Boolean(deferredMemberSearch) && matchingMembers.isPending;

  const resetPagination = () => {
    setCursorStack([undefined]);
    setPage(0);
  };

  const resetFilters = () => {
    setSearch("");
    setMemberSearch("");
    setMemberId(null);
    setActorUserId(null);
    setActionKey(null);
    setTargetType(null);
    setOutcome(null);
    setFrom("");
    setTo("");
    resetPagination();
  };

  return (
    <main className={adminPageLayoutClassName}>
      <AdminPageHeader
        description="Search privileged actions by the administrator, action, affected member, or target. History is append-only and begins at deployment."
        eyebrow={ADMIN_PAGE_EYEBROWS.logs}
        icon={ScrollText}
        title="Admin action logs"
      />

      <Card className="gap-0 border-white/10 bg-card/95 py-0 shadow-2xl shadow-black/25">
        <CardHeader className="border-b border-border/70 px-4 py-4 sm:px-6">
          <CardTitle className="text-base">Search and filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-4 sm:p-6">
          <div>
            <Label htmlFor="audit-search">Search</Label>
            <div className="relative mt-2">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="audit-search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  resetPagination();
                }}
                placeholder="Search actor, action, target, or ID"
                className="pl-9"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <Label htmlFor="audit-member">Member involved</Label>
              <ResponsiveComboBox
                ariaLabel="Filter by involved member"
                items={memberOptions}
                value={memberId}
                onSearchValueChange={setMemberSearch}
                onValueChange={(value) => {
                  setMemberId(value);
                  resetPagination();
                }}
                getItemValue={(member) => member.id}
                getItemLabel={memberLabel}
                getItemSearchValue={(member) =>
                  `${memberLabel(member)} ${member.id} ${member.userId}`
                }
                renderItem={(member) => (
                  <span className="truncate">{memberLabel(member)}</span>
                )}
                buttonPlaceholder="Any member"
                emptyMessage="No members found."
                filterItems={false}
                inputPlaceholder="Find a member…"
                isLoading={memberOptionsPending}
                triggerClassName="mt-2"
                triggerId="audit-member"
              />
            </div>

            <div>
              <Label htmlFor="audit-actor">Actor only</Label>
              <ResponsiveComboBox
                ariaLabel="Filter by actor"
                items={memberOptions}
                value={
                  memberOptions.find((member) => member.userId === actorUserId)
                    ?.id ?? null
                }
                onSearchValueChange={setMemberSearch}
                onItemSelect={(member) => {
                  setActorUserId(member.userId);
                  resetPagination();
                }}
                getItemValue={(member) => member.id}
                getItemLabel={memberLabel}
                renderItem={(member) => (
                  <span className="truncate">{memberLabel(member)}</span>
                )}
                buttonPlaceholder="Any actor"
                emptyMessage="No members found."
                filterItems={false}
                inputPlaceholder="Find an administrator…"
                isLoading={memberOptionsPending}
                triggerClassName="mt-2"
                triggerId="audit-actor"
              />
            </div>

            <div>
              <Label htmlFor="audit-action">Action</Label>
              <Select
                value={actionKey ?? ALL}
                onValueChange={(value) => {
                  setActionKey(
                    value === ALL ? null : (value as AuditActionKey),
                  );
                  resetPagination();
                }}
              >
                <SelectTrigger id="audit-action" className="mt-2">
                  <SelectValue placeholder="Any action" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value={ALL}>Any action</SelectItem>
                  {AUDIT_ACTION_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {AUDIT_ACTION_CATALOG[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="audit-outcome">Outcome</Label>
              <Select
                value={outcome ?? ALL}
                onValueChange={(value) => {
                  setOutcome(value === ALL ? null : (value as AuditOutcome));
                  resetPagination();
                }}
              >
                <SelectTrigger id="audit-outcome" className="mt-2">
                  <SelectValue placeholder="Any outcome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Any outcome</SelectItem>
                  <SelectItem value="committed">Committed</SelectItem>
                  <SelectItem value="partial_external">
                    Partial external
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="audit-target-type">Target type</Label>
              <Select
                value={targetType ?? ALL}
                onValueChange={(value) => {
                  setTargetType(
                    value === ALL ? null : (value as AuditTargetType),
                  );
                  resetPagination();
                }}
              >
                <SelectTrigger id="audit-target-type" className="mt-2">
                  <SelectValue placeholder="Any target" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value={ALL}>Any target</SelectItem>
                  {AUDIT_TARGET_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="audit-from">From</Label>
              <Input
                id="audit-from"
                type="date"
                className="mt-2"
                value={from}
                onChange={(event) => {
                  setFrom(event.target.value);
                  resetPagination();
                }}
              />
            </div>

            <div>
              <Label htmlFor="audit-to">To</Label>
              <Input
                id="audit-to"
                type="date"
                className="mt-2"
                value={to}
                onChange={(event) => {
                  setTo(event.target.value);
                  resetPagination();
                }}
              />
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={resetFilters}
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Reset filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 overflow-hidden border-white/10 bg-card/95 py-0 shadow-2xl shadow-black/25">
        <CardContent className="p-0">
          {eventsError ? (
            <div className="flex gap-3 p-6 text-sm text-destructive-foreground">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {eventsError.message}
            </div>
          ) : !eventPage ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Loading admin logs…
            </div>
          ) : eventPage.items.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-medium">No matching admin actions</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Adjust the search or filters to broaden the history.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Outcome</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventPage.items.map((event) => (
                  <EventRow
                    key={event.id}
                    event={event}
                    onSelect={setSelectedEventId}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Page {page + 1}</p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={page === 0 || eventsFetching}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!eventPage?.nextCursor || eventsFetching}
            onClick={() => {
              const nextCursor = eventPage?.nextCursor;
              if (!nextCursor) return;
              setCursorStack((current) => [
                ...current.slice(0, page + 1),
                nextCursor,
              ]);
              setPage((current) => current + 1);
            }}
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <DetailSheet
        eventId={selectedEventId}
        onOpenChange={(open) => {
          if (!open) setSelectedEventId(null);
        }}
      />
    </main>
  );
}
