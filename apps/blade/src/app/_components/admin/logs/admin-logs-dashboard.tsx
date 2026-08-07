"use client";

import type { CSSProperties } from "react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCcw,
  ScrollText,
  Search,
} from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import type {
  AuditActionKey,
  AuditCheckInOutcome,
  AuditDomain,
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@forge/ui/sheet";
import { Skeleton } from "@forge/ui/skeleton";
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
  AUDIT_DOMAINS,
  AUDIT_TARGET_TYPES,
} from "@forge/validators";

import {
  AdminPageHeader,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";
import { ADMIN_PAGE_EYEBROWS } from "~/consts/admin-page-eyebrows";
import { formatClubDateTime, localNewYorkDateTime } from "~/lib/dates";
import { api } from "~/trpc/react";
import { auditUuidParam } from "./admin-log-options";

export { auditUuidParam } from "./admin-log-options";

type AuditEvent = RouterOutputs["audit"]["list"]["items"][number];
type AuditMember = RouterOutputs["audit"]["searchMembers"][number];
type AuditHacker = RouterOutputs["audit"]["searchHackers"][number];
type AuditDetail = RouterOutputs["audit"]["detail"];

interface Cursor {
  id: string;
  occurredAt: Date;
}

const ALL = "__all__";

interface AuditFilterOption {
  label: string;
  searchValue: string;
  value: string;
}

const CHECK_IN_OUTCOMES = [
  "checked_in",
  "already_checked_in",
  "invalid_qr",
  "hacker_not_found",
  "wrong_status",
  "not_checked_in",
  "wrong_class",
  "not_ready",
] as const satisfies readonly AuditCheckInOutcome[];

function titleCaseFilterValue(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function option(value: string, label = titleCaseFilterValue(value)) {
  return { label, searchValue: `${label} ${value}`, value };
}

const DOMAIN_OPTIONS: readonly AuditFilterOption[] = [
  option(ALL, "Any domain"),
  ...AUDIT_DOMAINS.map((value) => option(value)),
];
const ACTION_OPTIONS: readonly AuditFilterOption[] = [
  option(ALL, "Any action"),
  ...AUDIT_ACTION_KEYS.map((key) => ({
    label: AUDIT_ACTION_CATALOG[key].label,
    searchValue: `${AUDIT_ACTION_CATALOG[key].label} ${key} ${AUDIT_ACTION_CATALOG[key].domain}`,
    value: key,
  })),
];
const OUTCOME_OPTIONS: readonly AuditFilterOption[] = [
  option(ALL, "Any status"),
  option("committed", "Committed"),
  option("partial_external", "Partial external"),
];
const CHECK_IN_OUTCOME_OPTIONS: readonly AuditFilterOption[] = [
  option(ALL, "Any result"),
  ...CHECK_IN_OUTCOMES.map((value) => option(value)),
];
const TARGET_TYPE_OPTIONS: readonly AuditFilterOption[] = [
  option(ALL, "Any target type"),
  ...AUDIT_TARGET_TYPES.map((value) => option(value)),
];

function AuditFilterComboBox({
  ariaLabel,
  inputPlaceholder,
  items,
  onValueChange,
  triggerId,
  value,
}: {
  ariaLabel: string;
  inputPlaceholder: string;
  items: readonly AuditFilterOption[];
  onValueChange: (value: string) => void;
  triggerId: string;
  value: string;
}) {
  return (
    <ResponsiveComboBox
      ariaLabel={ariaLabel}
      buttonPlaceholder={items[0]?.label ?? "Any"}
      emptyMessage="No matching options."
      getItemLabel={(item) => item.label}
      getItemSearchValue={(item) => item.searchValue}
      getItemValue={(item) => item.value}
      inputPlaceholder={inputPlaceholder}
      items={items}
      onValueChange={onValueChange}
      renderItem={(item) => (
        <span className="min-w-0 truncate">{item.label}</span>
      )}
      triggerClassName="mt-2"
      triggerId={triggerId}
      value={value}
    />
  );
}

function memberLabel(member: AuditMember) {
  return `${member.firstName} ${member.lastName}`.trim();
}

function hackerLabel(hacker: AuditHacker) {
  return `${hacker.firstName} ${hacker.lastName}`.trim();
}

function keepSelected<T>(
  items: readonly T[],
  selected: T | null,
  key: (item: T) => string,
) {
  if (!selected || items.some((item) => key(item) === key(selected))) {
    return items;
  }
  return [selected, ...items];
}

function formatTimestamp(value: Date) {
  return formatClubDateTime(value);
}

export function auditDateBoundary(date: string, edge: "end" | "start") {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  if (edge === "start") {
    return new Date(localNewYorkDateTime(`${date}T00:00:00`));
  }
  const nextDay = new Date(`${date}T12:00:00.000Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const nextDate = nextDay.toISOString().slice(0, 10);
  return new Date(
    new Date(localNewYorkDateTime(`${nextDate}T00:00:00`)).getTime() - 1,
  );
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

export function DetailSheet({
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
          <>
            <SheetHeader className="pr-8">
              <SheetTitle>Audit event detail</SheetTitle>
              <SheetDescription>
                Loading the selected audit event.
              </SheetDescription>
            </SheetHeader>
            <div
              aria-label="Audit event detail loading"
              aria-busy="true"
              className="mt-6 space-y-6"
            >
              <div className="flex gap-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <div className="space-y-3 rounded-md border border-white/10 bg-background/60 p-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3"
                    key={index}
                  >
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-24 w-full rounded-md" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-16 w-full rounded-md" />
                <Skeleton className="h-16 w-full rounded-md" />
              </div>
            </div>
          </>
        ) : detail.error ? (
          <div className="space-y-4">
            <SheetHeader className="pr-8">
              <SheetTitle>Audit detail unavailable</SheetTitle>
              <SheetDescription>
                The selected audit event could not be loaded.
              </SheetDescription>
            </SheetHeader>
            <div className="flex gap-3 rounded-md border border-destructive/35 bg-destructive/10 p-4 text-sm text-destructive-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {detail.error.message}
            </div>
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

function EventCard({
  event,
  onSelect,
}: {
  event: AuditEvent;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      className="grid w-full gap-3 border-b border-border/70 p-4 text-left last:border-b-0"
      onClick={() => onSelect(event.id)}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{event.actionLabel}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {event.actionKey}
          </p>
        </div>
        <OutcomeBadge outcome={event.outcome} />
      </div>
      <div className="rounded-md border border-white/10 bg-background/45 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Target
        </p>
        <p className="mt-1 break-words font-medium">
          {event.primaryTarget?.label ?? "Unknown target"}
        </p>
        <p className="text-xs text-muted-foreground">
          {event.primaryTarget?.type ?? "unknown"}
        </p>
      </div>
      <div className="flex items-end justify-between gap-3 text-sm">
        <div className="min-w-0">
          <p
            className="truncate font-semibold"
            style={actorStyle(event.actor.roleColor)}
          >
            {event.actor.label}
          </p>
          {event.actor.roleLabel ? (
            <p className="truncate text-xs text-muted-foreground">
              {event.actor.roleLabel}
            </p>
          ) : null}
        </div>
        <time className="shrink-0 text-xs text-muted-foreground">
          {formatTimestamp(event.occurredAt)}
        </time>
      </div>
    </button>
  );
}

export function AdminLogsDashboard({
  events,
  hackers,
  members,
}: {
  events: RouterOutputs["audit"]["list"];
  hackers: RouterOutputs["audit"]["searchHackers"];
  members: RouterOutputs["audit"]["searchMembers"];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pendingSearchRef = useRef<string | null>(null);
  const searchQuery = searchParams.get("q") ?? "";
  const [search, setSearch] = useState(searchQuery);
  const deferredSearch = useDeferredValue(search.trim());
  const [memberSearch, setMemberSearch] = useState("");
  const deferredMemberSearch = useDeferredValue(memberSearch.trim());
  const [actorSearch, setActorSearch] = useState("");
  const deferredActorSearch = useDeferredValue(actorSearch.trim());
  const [hackerSearch, setHackerSearch] = useState("");
  const deferredHackerSearch = useDeferredValue(hackerSearch.trim());
  const memberId = auditUuidParam(searchParams.get("member"));
  const actorUserId = auditUuidParam(searchParams.get("actor"));
  const hackerAttendeeId = auditUuidParam(searchParams.get("hacker"));
  const [selectedMember, setSelectedMember] = useState<AuditMember | null>(
    () => members.find((member) => member.id === memberId) ?? null,
  );
  const [selectedActor, setSelectedActor] = useState<AuditMember | null>(
    () => members.find((member) => member.userId === actorUserId) ?? null,
  );
  const [selectedHacker, setSelectedHacker] = useState<AuditHacker | null>(
    () =>
      hackers.find((hacker) => hacker.attendeeId === hackerAttendeeId) ?? null,
  );
  const actionParam = searchParams.get("action");
  const actionKey = AUDIT_ACTION_KEYS.includes(actionParam as AuditActionKey)
    ? (actionParam as AuditActionKey)
    : null;
  const domainParam = searchParams.get("domain");
  const domain = AUDIT_DOMAINS.includes(domainParam as AuditDomain)
    ? (domainParam as AuditDomain)
    : null;
  const checkInOutcomeParam = searchParams.get("checkInResult");
  const checkInOutcome = CHECK_IN_OUTCOMES.includes(
    checkInOutcomeParam as AuditCheckInOutcome,
  )
    ? (checkInOutcomeParam as AuditCheckInOutcome)
    : null;
  const targetParam = searchParams.get("target");
  const targetType = AUDIT_TARGET_TYPES.includes(targetParam as AuditTargetType)
    ? (targetParam as AuditTargetType)
    : null;
  const outcome = ["committed", "partial_external"].includes(
    searchParams.get("status") ?? "",
  )
    ? (searchParams.get("status") as AuditOutcome)
    : null;
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const [cursorStack, setCursorStack] = useState<(Cursor | undefined)[]>([
    undefined,
  ]);
  const [page, setPage] = useState(0);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  useEffect(() => {
    setSearch(searchQuery);
  }, [searchQuery]);

  function latestParams() {
    const committed = searchParams.toString();
    if (pendingSearchRef.current === committed) {
      pendingSearchRef.current = null;
    }
    return new URLSearchParams(pendingSearchRef.current ?? committed);
  }

  function replaceParams(params: URLSearchParams) {
    params.sort();
    const query = params.toString();
    pendingSearchRef.current = query;
    router.replace(`/admin/logs${query ? `?${query}` : ""}`, {
      scroll: false,
    });
  }

  function setFilter(key: string, value: string | null) {
    const params = latestParams();
    if (value) params.set(key, value);
    else params.delete(key);
    replaceParams(params);
    resetPagination();
  }

  const queryInput = useMemo(
    () => ({
      ...(actionKey ? { actionKeys: [actionKey] } : {}),
      ...(actorUserId ? { actorUserId } : {}),
      ...(checkInOutcome ? { checkInOutcomes: [checkInOutcome] } : {}),
      cursor: cursorStack[page],
      ...(domain ? { domains: [domain] } : {}),
      ...(from ? { from: auditDateBoundary(from, "start") } : {}),
      limit: 50,
      ...(hackerAttendeeId ? { hackerAttendeeId } : {}),
      ...(memberId ? { memberId } : {}),
      ...(outcome ? { outcomes: [outcome] } : {}),
      ...(deferredSearch ? { search: deferredSearch } : {}),
      ...(targetType ? { targetTypes: [targetType] } : {}),
      ...(to ? { to: auditDateBoundary(to, "end") } : {}),
    }),
    [
      actionKey,
      actorUserId,
      checkInOutcome,
      cursorStack,
      deferredSearch,
      domain,
      from,
      hackerAttendeeId,
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
    !checkInOutcome &&
    !cursorStack[page] &&
    !deferredSearch &&
    !domain &&
    !from &&
    !hackerAttendeeId &&
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
  const matchingActors = api.audit.searchMembers.useQuery(
    {
      limit: 20,
      search: deferredActorSearch,
    },
    { enabled: Boolean(deferredActorSearch) },
  );
  const matchingHackers = api.audit.searchHackers.useQuery(
    {
      limit: 20,
      search: deferredHackerSearch,
    },
    { enabled: Boolean(deferredHackerSearch) },
  );
  const eventPage = isDefaultEventQuery ? events : filteredEvents.data;
  const eventsError = isDefaultEventQuery ? null : filteredEvents.error;
  const eventsFetching = !isDefaultEventQuery && filteredEvents.isFetching;
  const effectiveMember =
    selectedMember?.id === memberId
      ? selectedMember
      : (members.find((member) => member.id === memberId) ?? null);
  const effectiveActor =
    selectedActor?.userId === actorUserId
      ? selectedActor
      : (members.find((member) => member.userId === actorUserId) ?? null);
  const effectiveHacker =
    selectedHacker?.attendeeId === hackerAttendeeId
      ? selectedHacker
      : (hackers.find((hacker) => hacker.attendeeId === hackerAttendeeId) ??
        null);
  const memberOptions = keepSelected(
    deferredMemberSearch ? (matchingMembers.data ?? []) : members,
    effectiveMember,
    (member) => member.id,
  );
  const actorOptions = keepSelected(
    deferredActorSearch ? (matchingActors.data ?? []) : members,
    effectiveActor,
    (member) => member.id,
  );
  const hackerOptions = keepSelected(
    deferredHackerSearch ? (matchingHackers.data ?? []) : hackers,
    effectiveHacker,
    (hacker) => hacker.attendeeId,
  );
  const memberOptionsPending =
    Boolean(deferredMemberSearch) && matchingMembers.isPending;
  const actorOptionsPending =
    Boolean(deferredActorSearch) && matchingActors.isPending;
  const hackerOptionsPending =
    Boolean(deferredHackerSearch) && matchingHackers.isPending;

  const resetPagination = () => {
    setCursorStack([undefined]);
    setPage(0);
  };

  const resetFilters = () => {
    setSearch("");
    setMemberSearch("");
    setActorSearch("");
    setHackerSearch("");
    setSelectedMember(null);
    setSelectedActor(null);
    setSelectedHacker(null);
    replaceParams(new URLSearchParams());
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
                  const value = event.target.value;
                  setSearch(value);
                  setFilter("q", value.trim() || null);
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
                onItemSelect={(member) => {
                  setSelectedMember(member);
                  setFilter("member", member.id);
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
              <Label htmlFor="audit-hacker">Hacker involved</Label>
              <ResponsiveComboBox
                ariaLabel="Filter by involved hacker"
                items={hackerOptions}
                value={hackerAttendeeId}
                onSearchValueChange={setHackerSearch}
                onItemSelect={(hacker) => {
                  setSelectedHacker(hacker);
                  setFilter("hacker", hacker.attendeeId);
                }}
                getItemValue={(hacker) => hacker.attendeeId}
                getItemLabel={(hacker) =>
                  `${hackerLabel(hacker)} · ${hacker.hackathonName}`
                }
                getItemSearchValue={(hacker) =>
                  `${hackerLabel(hacker)} ${hacker.email} ${hacker.hackathonName} ${hacker.attendeeId} ${hacker.hackerId} ${hacker.userId}`
                }
                renderItem={(hacker) => (
                  <span className="min-w-0">
                    <span className="block truncate">
                      {hackerLabel(hacker)}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {hacker.hackathonName}
                    </span>
                  </span>
                )}
                buttonPlaceholder="Any hacker"
                emptyMessage="No hackers found."
                filterItems={false}
                inputPlaceholder="Find a hacker…"
                isLoading={hackerOptionsPending}
                triggerClassName="mt-2"
                triggerId="audit-hacker"
              />
            </div>

            <div>
              <Label htmlFor="audit-actor">Actor only</Label>
              <ResponsiveComboBox
                ariaLabel="Filter by actor"
                items={actorOptions}
                value={effectiveActor?.id ?? null}
                onSearchValueChange={setActorSearch}
                onItemSelect={(member) => {
                  setSelectedActor(member);
                  setFilter("actor", member.userId);
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
                isLoading={actorOptionsPending}
                triggerClassName="mt-2"
                triggerId="audit-actor"
              />
            </div>

            <div>
              <Label htmlFor="audit-domain">Domain</Label>
              <AuditFilterComboBox
                ariaLabel="Filter by domain"
                inputPlaceholder="Search domains…"
                items={DOMAIN_OPTIONS}
                triggerId="audit-domain"
                value={domain ?? ALL}
                onValueChange={(value) => {
                  setFilter("domain", value === ALL ? null : value);
                }}
              />
            </div>

            <div>
              <Label htmlFor="audit-action">Action</Label>
              <AuditFilterComboBox
                ariaLabel="Filter by action"
                inputPlaceholder="Search actions or keys…"
                items={ACTION_OPTIONS}
                triggerId="audit-action"
                value={actionKey ?? ALL}
                onValueChange={(value) => {
                  setFilter("action", value === ALL ? null : value);
                }}
              />
            </div>

            <div>
              <Label htmlFor="audit-outcome">Commit status</Label>
              <AuditFilterComboBox
                ariaLabel="Filter by commit status"
                inputPlaceholder="Search commit statuses…"
                items={OUTCOME_OPTIONS}
                triggerId="audit-outcome"
                value={outcome ?? ALL}
                onValueChange={(value) => {
                  setFilter("status", value === ALL ? null : value);
                }}
              />
            </div>

            <div>
              <Label htmlFor="audit-check-in-outcome">Check-in result</Label>
              <AuditFilterComboBox
                ariaLabel="Filter by check-in result"
                inputPlaceholder="Search check-in results…"
                items={CHECK_IN_OUTCOME_OPTIONS}
                triggerId="audit-check-in-outcome"
                value={checkInOutcome ?? ALL}
                onValueChange={(value) => {
                  setFilter("checkInResult", value === ALL ? null : value);
                }}
              />
            </div>

            <div>
              <Label htmlFor="audit-target-type">Target type</Label>
              <AuditFilterComboBox
                ariaLabel="Filter by target type"
                inputPlaceholder="Search target types…"
                items={TARGET_TYPE_OPTIONS}
                triggerId="audit-target-type"
                value={targetType ?? ALL}
                onValueChange={(value) => {
                  setFilter("target", value === ALL ? null : value);
                }}
              />
            </div>

            <div>
              <Label htmlFor="audit-from">From</Label>
              <Input
                id="audit-from"
                type="date"
                className="mt-2"
                value={from}
                onChange={(event) => {
                  setFilter("from", event.target.value || null);
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
                  setFilter("to", event.target.value || null);
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
        <CardContent aria-busy={eventsFetching} className="p-0">
          {eventsFetching ? (
            <div
              aria-live="polite"
              className="flex items-center gap-2 border-b border-border/70 bg-primary/5 px-4 py-2 text-sm text-muted-foreground sm:px-6"
            >
              <Loader2
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              Updating admin logs
            </div>
          ) : null}
          <div
            className={`transition-opacity duration-150 motion-reduce:transition-none ${eventsFetching ? "opacity-70" : ""}`}
          >
            {eventsError ? (
              <div className="flex gap-3 p-6 text-sm text-destructive-foreground">
                <AlertTriangle
                  className="h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
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
              <>
                <div className="md:hidden">
                  {eventPage.items.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onSelect={setSelectedEventId}
                    />
                  ))}
                </div>
                <div className="hidden overflow-x-auto md:block">
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
                </div>
              </>
            )}
          </div>
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
