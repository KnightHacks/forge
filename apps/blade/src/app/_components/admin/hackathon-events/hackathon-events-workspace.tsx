"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowDownAZ,
  ArrowDownUp,
  CalendarClock,
  CalendarDays,
  Copy,
  ExternalLink,
  History,
  List,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Tags,
  Trash2,
  X,
} from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Card, CardContent } from "@forge/ui/card";
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
import { toast } from "@forge/ui/toast";
import { EVENT_DISCORD_NO_PROJECTION_CONFIRMATION } from "@forge/validators";

import type {
  HackathonEventFormInitial,
  HackathonEventFormValue,
} from "./hackathon-event-form-dialog";
import type {
  EventListItem,
  EventTagItem,
} from "~/app/_components/admin/events/types";
import { EventCalendar } from "~/app/_components/admin/events/event-calendar";
import {
  EventTag,
  IntegrationStatus,
} from "~/app/_components/admin/events/event-presenters";
import { EventTagManagement } from "~/app/_components/admin/events/event-tag-management";
import { EventWorkspaceSections } from "~/app/_components/admin/events/event-workspace-sections";
import { explicitNewYorkInstant } from "~/app/_components/admin/events/server-adapters";
import {
  AdminPageHeader,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";
import { ADMIN_PAGE_EYEBROWS } from "~/consts/admin-page-eyebrows";
import { formatClubDateTime } from "~/lib/dates";
import { api } from "~/trpc/react";
import { HackathonEventFilters } from "./hackathon-event-filters";
import { HackathonEventFormDialog } from "./hackathon-event-form-dialog";
import { HackathonTagImportDialog } from "./hackathon-tag-import-dialog";
import { PublicationControls } from "./publication-controls";

type EventRow = RouterOutputs["hackathonEvent"]["listEvents"]["rows"][number];
type View = "calendar" | "list" | "tags";
type Timing = "past" | "upcoming";
type SortField = "attendance" | "name" | "start" | "tag";

export function editableHackathonEventPayload(value: HackathonEventFormValue) {
  const { creationKey: _creationKey, ...payload } = value;
  return payload;
}

interface FormState {
  eventId: string | null;
  expectedRevision: number | null;
  initial: HackathonEventFormInitial | null;
  key: string;
  mode: "create" | "duplicate" | "edit";
}

function mutationFeedback(result: { status: string }, successMessage: string) {
  if (result.status === "published" || result.status === "deleted") {
    toast.success(successMessage);
    return;
  }
  toast.warning(
    result.status === "syncing"
      ? `${successMessage} Provider synchronization is still running.`
      : `${successMessage} One or more providers need attention.`,
  );
}

function initialFromRow(
  event: EventRow,
  mode: "duplicate" | "edit",
): HackathonEventFormInitial {
  return {
    description: event.description,
    endAt: event.endAt,
    location: event.location,
    name: mode === "duplicate" ? `${event.name} copy` : event.name,
    points: event.points ?? 0,
    purpose:
      mode === "duplicate" && event.purpose === "primary_check_in"
        ? "event"
        : event.purpose,
    startAt: event.startAt,
    tag: event.tag,
  };
}

function positiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const MAX_CALENDAR_WINDOW_MS = 120 * 24 * 60 * 60 * 1_000;

export function hackathonCalendarWindow(
  start: string | null,
  end: string | null,
) {
  if (!start || !end) return null;
  const startAt = new Date(start);
  const endAt = new Date(end);
  const duration = endAt.getTime() - startAt.getTime();
  if (
    Number.isNaN(startAt.getTime()) ||
    Number.isNaN(endAt.getTime()) ||
    duration <= 0 ||
    duration > MAX_CALENDAR_WINDOW_MS
  ) {
    return null;
  }
  return {
    calendarEnd: explicitNewYorkInstant(endAt),
    calendarStart: explicitNewYorkInstant(startAt),
    initialDate: new Date(
      (startAt.getTime() + endAt.getTime()) / 2,
    ).toISOString(),
  };
}

export function canDeleteHackathonEvent(attendanceCount: number) {
  return attendanceCount === 0;
}

function asCalendarEvent(event: EventRow): EventListItem {
  return {
    attendanceCount: event.attendanceCount,
    audience: "public",
    description: event.description,
    deletionPending: Boolean(event.deletionIntentAt),
    discordHealth: event.discord.state ?? "unknown",
    endDateTime: new Date(event.endAt).toISOString(),
    feedback: event.feedback,
    googleHealth: event.google.state ?? "unknown",
    id: event.id,
    internal: false,
    legacy: event.legacy,
    location: event.location,
    name: event.name,
    points: event.points ?? undefined,
    revision: event.revision,
    startDateTime: new Date(event.startAt).toISOString(),
    tag: event.tag,
    tagColor: event.tagColor,
  };
}

function healthNeedsAttention(event: EventRow) {
  return (
    event.deletionIntentAt !== null ||
    event.discord.state !== "synced" ||
    event.google.state !== "synced"
  );
}

export function HackathonEventsWorkspace({
  canEdit,
  isOfficer,
}: {
  canEdit: boolean;
  isOfficer: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const utils = api.useUtils();
  const searchQuery = searchParams.get("q") ?? "";
  const calendarStart = searchParams.get("calendarStart");
  const calendarEnd = searchParams.get("calendarEnd");
  const calendarWindow = hackathonCalendarWindow(calendarStart, calendarEnd);
  const [form, setForm] = useState<FormState | null>(null);
  const [deleting, setDeleting] = useState<EventRow | null>(null);
  const [selected, setSelected] = useState<EventRow | null>(null);
  const [retryingEventId, setRetryingEventId] = useState<string | null>(null);
  const [discordAction, setDiscordAction] = useState<string | null>(null);
  const [discordPhrase, setDiscordPhrase] = useState("");
  const [discordReview, setDiscordReview] = useState<{
    candidates: {
      entityType: "external" | "stage" | "voice";
      id: string;
      name: string;
      startAt: Date | string;
    }[];
    snapshotToken: string;
  } | null>(null);
  const [searchDraft, setSearchDraft] = useState(searchQuery);
  const pendingSearchRef = useRef<string | null>(null);

  useEffect(() => {
    setSearchDraft(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    setDiscordReview(null);
    setDiscordPhrase("");
  }, [selected?.id]);

  const view: View =
    searchParams.get("view") === "calendar"
      ? "calendar"
      : searchParams.get("view") === "tags"
        ? "tags"
        : "list";
  const calendarMode =
    searchParams.get("calendarMode") === "day" ? "day" : "month";
  const timing: Timing =
    searchParams.get("timing") === "past" ? "past" : "upcoming";
  const purpose: "event" | "primary_check_in" | undefined =
    searchParams.get("purpose") === "event" ||
    searchParams.get("purpose") === "primary_check_in"
      ? (searchParams.get("purpose") as "event" | "primary_check_in")
      : undefined;
  const integrationState = [
    "healthy",
    "needs_attention",
    "pending",
    "error",
    "unknown",
  ].includes(searchParams.get("health") ?? "")
    ? (searchParams.get("health") as
        | "error"
        | "healthy"
        | "needs_attention"
        | "pending"
        | "unknown")
    : undefined;
  const sortField: SortField = ["attendance", "name", "start", "tag"].includes(
    searchParams.get("sort") ?? "",
  )
    ? (searchParams.get("sort") as SortField)
    : "start";
  const requestedSortDirection = searchParams.get("direction");
  const sortDirection =
    requestedSortDirection === "desc"
      ? ("desc" as const)
      : requestedSortDirection === "asc"
        ? ("asc" as const)
        : sortField === "start" && timing === "past"
          ? ("desc" as const)
          : ("asc" as const);
  const requestedPageSize = positiveInteger(searchParams.get("pageSize"), 25);
  const pageSize = ([25, 50, 100, 250] as const).includes(
    requestedPageSize as 25 | 50 | 100 | 250,
  )
    ? (requestedPageSize as 25 | 50 | 100 | 250)
    : 25;
  const page = positiveInteger(searchParams.get("page"), 1);
  const selectedTags = searchParams.getAll("tag").filter(Boolean);

  const hackathons = api.hackathonEvent.listCheckInHackathons.useQuery();
  const requestedHackathonId = searchParams.get("hackathon");
  const selectedHackathon = useMemo(
    () =>
      hackathons.data?.find(({ id }) => id === requestedHackathonId) ??
      hackathons.data?.[0] ??
      null,
    [hackathons.data, requestedHackathonId],
  );

  const events = api.hackathonEvent.listEvents.useQuery(
    {
      hackathonId: selectedHackathon?.id ?? "",
      page,
      pageSize,
      search: searchQuery,
      sortDirection,
      sortField,
      tags: selectedTags,
      timing: view === "calendar" ? "all" : timing,
      view: view === "calendar" ? "calendar" : "list",
      ...(purpose ? { purpose } : {}),
      ...(integrationState ? { integrationState } : {}),
      ...(view === "calendar" && calendarWindow
        ? {
            calendarEnd: calendarWindow.calendarEnd,
            calendarStart: calendarWindow.calendarStart,
          }
        : {}),
    },
    { enabled: selectedHackathon !== null && view !== "tags" },
  );
  const tags = api.hackathonEvent.listTags.useQuery(
    { hackathonId: selectedHackathon?.id ?? "" },
    { enabled: selectedHackathon !== null },
  );
  const createEvent = api.hackathonEvent.createEvent.useMutation();
  const updateEvent = api.hackathonEvent.updateEvent.useMutation();
  const deleteEvent = api.hackathonEvent.deleteEvent.useMutation();
  const retrySync = api.hackathonEvent.retrySync.useMutation();
  const resolveDiscord =
    api.hackathonEvent.resolveDiscordProjection.useMutation();
  const provisionFeedback = api.hackathonEvent.provisionFeedback.useMutation();
  const createTag = api.hackathonEvent.createTag.useMutation();
  const updateTag = api.hackathonEvent.updateTag.useMutation();
  const archiveTag = api.hackathonEvent.archiveTag.useMutation();

  const tagItems = (tags.data ?? []) satisfies EventTagItem[];
  const activeTags = tagItems.filter(({ active }) => active);

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
    router.replace(
      `/admin/hackathon-events${query.length > 0 ? `?${query}` : ""}`,
      { scroll: false },
    );
  }

  function mutateParams(mutator: (params: URLSearchParams) => void) {
    const params = latestParams();
    mutator(params);
    replaceParams(params);
  }

  function navigate(changes: Record<string, string | null>) {
    mutateParams((params) => {
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
    });
  }

  function selectHackathon(hackathonId: string) {
    setForm(null);
    setDeleting(null);
    setSelected(null);
    setDiscordReview(null);
    setDiscordPhrase("");
    mutateParams((params) => {
      params.set("hackathon", hackathonId);
      params.delete("page");
      // Tags belong to one hackathon and cannot safely carry across scopes.
      params.delete("tag");
    });
  }

  function sectionHref(nextView: View) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", nextView);
    params.delete("page");
    params.sort();
    return `/admin/hackathon-events?${params.toString()}`;
  }

  useEffect(() => {
    if (!selectedHackathon || requestedHackathonId === selectedHackathon.id) {
      return;
    }
    mutateParams((params) => {
      params.set("hackathon", selectedHackathon.id);
      params.delete("page");
      params.delete("tag");
    });
    // URL normalization is intentionally driven only by the resolved scope.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedHackathonId, selectedHackathon?.id]);

  useEffect(() => {
    const serverPage = events.data?.pagination.page;
    if (view !== "list" || serverPage === undefined || serverPage === page) {
      return;
    }
    navigate({ page: serverPage === 1 ? null : String(serverPage) });
    // The server is authoritative when a stale URL requests a page past the end.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.data?.pagination.page, page, view]);

  async function refresh() {
    await Promise.all([
      utils.hackathonEvent.listEvents.invalidate(),
      utils.hackathonEvent.listTags.invalidate(),
      utils.hackathonEvent.previewTagImport.invalidate(),
    ]);
  }

  function openForm(mode: "create" | "duplicate" | "edit", event?: EventRow) {
    setForm({
      eventId: mode === "edit" && event ? event.id : null,
      expectedRevision: mode === "edit" && event ? event.revision : null,
      initial: event && mode !== "create" ? initialFromRow(event, mode) : null,
      key: `${mode}:${event?.id ?? "new"}:${crypto.randomUUID()}`,
      mode,
    });
  }

  async function saveEvent(value: HackathonEventFormValue) {
    if (!selectedHackathon || !form) return;
    const payload = editableHackathonEventPayload(value);
    if (form.eventId && form.expectedRevision !== null) {
      const result = await updateEvent.mutateAsync({
        ...payload,
        eventId: form.eventId,
        expectedRevision: form.expectedRevision,
        hackathonId: selectedHackathon.id,
      });
      mutationFeedback(result, "Event saved.");
    } else {
      const result = await createEvent.mutateAsync({
        ...payload,
        creationKey: value.creationKey,
        hackathonId: selectedHackathon.id,
      });
      mutationFeedback(
        result,
        form.mode === "duplicate" ? "Duplicate created." : "Event created.",
      );
    }
    setForm(null);
    await refresh();
  }

  async function removeEvent() {
    if (!selectedHackathon || !deleting) return;
    try {
      const result = await deleteEvent.mutateAsync({
        eventId: deleting.id,
        hackathonId: selectedHackathon.id,
      });
      mutationFeedback(result, "Event deletion started.");
      setDeleting(null);
      setSelected(null);
      await refresh();
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Event deletion failed.",
      );
    }
  }

  async function retryEvent(eventId: string) {
    if (!selectedHackathon || retryingEventId) return;
    setRetryingEventId(eventId);
    try {
      const result = await retrySync.mutateAsync({
        eventId,
        hackathonId: selectedHackathon.id,
      });
      mutationFeedback(result, "Provider synchronization retried.");
      await refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Retry failed.");
    } finally {
      setRetryingEventId(null);
    }
  }

  async function runDiscordAction(key: string, action: () => Promise<void>) {
    if (discordAction) return;
    setDiscordAction(key);
    try {
      await action();
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Discord repair failed.",
      );
    } finally {
      setDiscordAction(null);
    }
  }

  async function finishDiscordResolution(
    input:
      | { candidateId: string; mode: "link-existing" }
      | { mode: "confirm-create-new" }
      | {
          candidateSnapshotToken: string;
          confirmation: typeof EVENT_DISCORD_NO_PROJECTION_CONFIRMATION;
          mode: "confirm-no-projection";
        },
  ) {
    if (!selectedHackathon || !selected) return;
    await resolveDiscord.mutateAsync({
      ...input,
      eventId: selected.id,
      hackathonId: selectedHackathon.id,
    });
    toast.success("Discord event state resolved.");
    setDiscordReview(null);
    setDiscordPhrase("");
    setSelected(null);
    await refresh();
  }

  const rows = events.data?.rows ?? [];

  return (
    <main className={adminPageLayoutClassName}>
      <AdminPageHeader
        actions={
          <>
            <label
              className="min-w-[12rem] flex-1 sm:flex-none"
              htmlFor="hackathon-event-scope"
            >
              <span className="sr-only">Hackathon</span>
              <select
                className="h-11 w-full rounded-md border border-input bg-background/70 px-3 pr-10 text-sm sm:w-64"
                disabled={hackathons.isPending || !hackathons.data?.length}
                id="hackathon-event-scope"
                onChange={(event) => selectHackathon(event.target.value)}
                value={selectedHackathon?.id ?? ""}
              >
                {hackathons.data?.map((hackathon) => (
                  <option key={hackathon.id} value={hackathon.id}>
                    {hackathon.displayName}
                  </option>
                ))}
              </select>
            </label>
            {canEdit ? (
              <>
                {isOfficer ? (
                  <Button asChild className="min-h-11" variant="outline">
                    <Link href="/admin/events/feedback-template">
                      Feedback template
                    </Link>
                  </Button>
                ) : null}
                <Button
                  className="min-h-11 gap-2"
                  disabled={!selectedHackathon || activeTags.length === 0}
                  onClick={() => openForm("create")}
                  title={
                    activeTags.length === 0
                      ? "Create or import an active event tag first."
                      : undefined
                  }
                >
                  <Plus className="size-4" aria-hidden="true" /> Create event
                </Button>
              </>
            ) : null}
            {selectedHackathon ? (
              <PublicationControls
                canEdit={canEdit}
                hackathonId={selectedHackathon.id}
                hackathonName={selectedHackathon.displayName}
              />
            ) : null}
          </>
        }
        description="Manage schedules, attendance, feedback, and provider health for one hackathon."
        eyebrow={ADMIN_PAGE_EYEBROWS.hackathonEvents}
        icon={CalendarClock}
        title="Hackathon Events"
      />

      {hackathons.isError ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-start gap-3 py-4 text-destructive">
            <AlertTriangle className="mt-0.5 size-5" aria-hidden="true" />
            <p>{hackathons.error.message}</p>
          </CardContent>
        </Card>
      ) : null}

      <EventWorkspaceSections
        current={view}
        label="Hackathon event management sections"
        sections={[
          {
            href: sectionHref("list"),
            icon: List,
            label: "List",
            value: "list",
          },
          {
            href: sectionHref("calendar"),
            icon: CalendarDays,
            label: "Calendar",
            value: "calendar",
          },
          ...(canEdit
            ? [
                {
                  href: sectionHref("tags"),
                  icon: Tags,
                  label: "Tags",
                  value: "tags" as const,
                },
              ]
            : []),
        ]}
      />

      {view !== "tags" ? (
        <section className="rounded-lg border border-white/10 bg-card/95 p-3 shadow-lg shadow-black/15">
          <div className="flex min-w-0 flex-wrap items-end gap-2">
            {view === "list" ? (
              <div
                aria-label="Event timing"
                className="grid grid-cols-2 rounded-lg border border-white/10 bg-background/60 p-1"
                role="group"
              >
                <Button
                  aria-pressed={timing === "upcoming"}
                  className="min-h-10 gap-2"
                  onClick={() => navigate({ page: null, timing: null })}
                  type="button"
                  variant={timing === "upcoming" ? "primary" : "ghost"}
                >
                  <CalendarDays className="size-4" aria-hidden="true" />{" "}
                  Upcoming
                </Button>
                <Button
                  aria-pressed={timing === "past"}
                  className="min-h-10 gap-2"
                  onClick={() => navigate({ page: null, timing: "past" })}
                  type="button"
                  variant={timing === "past" ? "primary" : "ghost"}
                >
                  <History className="size-4" aria-hidden="true" /> Past
                </Button>
              </div>
            ) : null}

            <form
              className="relative min-w-[14rem] flex-1"
              onSubmit={(event) => {
                event.preventDefault();
                navigate({ page: null, q: searchDraft.trim() || null });
              }}
            >
              <Search
                className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                aria-label="Search hackathon events"
                className="h-11 pl-9"
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Search events"
                type="search"
                value={searchDraft}
              />
            </form>

            <HackathonEventFilters
              onApply={(filters) => {
                mutateParams((params) => {
                  params.delete("tag");
                  for (const tag of filters.tags) params.append("tag", tag);
                  if (filters.purpose) params.set("purpose", filters.purpose);
                  else params.delete("purpose");
                  if (filters.health) params.set("health", filters.health);
                  else params.delete("health");
                  params.delete("page");
                });
              }}
              tagOptions={tagItems}
              value={{
                ...(integrationState ? { health: integrationState } : {}),
                ...(purpose ? { purpose } : {}),
                tags: selectedTags,
              }}
            />
            {view === "list" ? (
              <>
                <select
                  aria-label="Sort events"
                  className="h-11 rounded-md border border-input bg-background px-3 pr-10 text-sm"
                  onChange={(event) =>
                    navigate({ page: null, sort: event.target.value })
                  }
                  value={sortField}
                >
                  <option value="start">Start time</option>
                  <option value="name">Name</option>
                  <option value="tag">Tag</option>
                  <option value="attendance">Attendance</option>
                </select>
                <Button
                  aria-label={`Sort ${sortDirection === "asc" ? "descending" : "ascending"}`}
                  className="min-h-11 gap-2"
                  onClick={() =>
                    navigate({
                      direction: sortDirection === "asc" ? "desc" : "asc",
                      page: null,
                    })
                  }
                  type="button"
                  variant="outline"
                >
                  {sortDirection === "asc" ? (
                    <ArrowDownAZ className="size-4" />
                  ) : (
                    <ArrowDownUp className="size-4" />
                  )}
                </Button>
                <select
                  aria-label="Page size"
                  className="h-11 rounded-md border border-input bg-background px-3 pr-10 text-sm"
                  onChange={(event) =>
                    navigate({ page: null, pageSize: event.target.value })
                  }
                  value={pageSize}
                >
                  {[25, 50, 100, 250].map((size) => (
                    <option key={size} value={size}>
                      {size} per page
                    </option>
                  ))}
                </select>
              </>
            ) : null}
          </div>
          {purpose || integrationState || selectedTags.length ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
              {purpose ? (
                <button
                  className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 bg-background/60 px-3 text-sm"
                  onClick={() => navigate({ page: null, purpose: null })}
                  type="button"
                >
                  Purpose:{" "}
                  {purpose === "event" ? "Ordinary event" : "Primary check-in"}
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              ) : null}
              {selectedTags.map((tag) => (
                <button
                  className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 bg-background/60 px-3 text-sm"
                  key={tag}
                  onClick={() => {
                    mutateParams((params) => {
                      params.delete("tag");
                      selectedTags
                        .filter((candidate) => candidate !== tag)
                        .forEach((candidate) =>
                          params.append("tag", candidate),
                        );
                      params.delete("page");
                    });
                  }}
                  type="button"
                >
                  Tag: {tag} <X className="size-3.5" aria-hidden="true" />
                </button>
              ))}
              {integrationState ? (
                <button
                  className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 bg-background/60 px-3 text-sm"
                  onClick={() => navigate({ health: null, page: null })}
                  type="button"
                >
                  Health: {integrationState.replace("_", " ")}
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {view !== "tags" && events.isPending ? (
        <Card>
          <CardContent className="flex items-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading events…
          </CardContent>
        </Card>
      ) : null}
      {view !== "tags" && events.isError ? (
        <Card className="border-destructive/40">
          <CardContent className="py-6 text-destructive">
            {events.error.message}
          </CardContent>
        </Card>
      ) : null}

      {view === "list" && events.data ? (
        <section className="overflow-hidden rounded-lg border border-white/10 bg-card/95 shadow-2xl shadow-black/25">
          {rows.length ? (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table
                  className="w-full min-w-[66rem] text-left text-sm"
                  aria-label="Hackathon events"
                >
                  <thead className="border-b border-border/70 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Event</th>
                      <th className="px-4 py-3 font-medium">When</th>
                      <th className="px-4 py-3 font-medium">Location</th>
                      <th className="px-4 py-3 text-right font-medium">
                        Attendance
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Feedback
                      </th>
                      <th className="px-4 py-3 font-medium">Sync health</th>
                      <th className="px-4 py-3 text-right font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {rows.map((event) => (
                      <tr className="hover:bg-background/40" key={event.id}>
                        <td className="px-4 py-3">
                          <button
                            className="max-w-64 text-left"
                            onClick={() => setSelected(event)}
                            type="button"
                          >
                            <span className="block truncate font-medium">
                              {event.name}
                            </span>
                            <span className="mt-1 flex flex-wrap items-center gap-2">
                              <EventTag
                                color={event.tagColor}
                                name={event.tag}
                              />
                              {event.purpose === "primary_check_in" ? (
                                <Badge variant="outline">
                                  Primary check-in
                                </Badge>
                              ) : null}
                              <span className="text-xs text-muted-foreground">
                                {event.points} pts
                              </span>
                            </span>
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {formatClubDateTime(event.startAt)}
                        </td>
                        <td className="max-w-48 truncate px-4 py-3">
                          {event.location}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {event.attendanceCount}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {!event.feedbackForm
                            ? "Not linked"
                            : event.feedback.averageOverall === null
                              ? `${event.feedback.responseCount} responses`
                              : `${event.feedback.averageOverall.toFixed(2)} / 5`}
                        </td>
                        <td className="px-4 py-3">
                          <div className="grid gap-1">
                            {healthNeedsAttention(event) ? (
                              <span className="text-xs font-medium text-destructive">
                                Needs attention
                              </span>
                            ) : null}
                            <IntegrationStatus
                              health={event.discord.state ?? "unknown"}
                              label="Discord"
                            />
                            <IntegrationStatus
                              health={event.google.state ?? "unknown"}
                              label="Google"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              onClick={() => setSelected(event)}
                              size="sm"
                              variant="outline"
                            >
                              View
                            </Button>
                            {canEdit ? (
                              <>
                                <Button
                                  aria-label={`Edit ${event.name}`}
                                  onClick={() => openForm("edit", event)}
                                  size="icon"
                                  variant="outline"
                                >
                                  <Pencil className="size-4" />
                                </Button>
                                <Button
                                  aria-label={`Duplicate ${event.name}`}
                                  onClick={() => openForm("duplicate", event)}
                                  size="icon"
                                  variant="outline"
                                >
                                  <Copy className="size-4" />
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="divide-y divide-border/60 md:hidden">
                {rows.map((event) => (
                  <article className="grid gap-3 p-4" key={event.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{event.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatClubDateTime(event.startAt)}
                        </p>
                      </div>
                      <Badge variant="secondary">{event.attendanceCount}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <EventTag color={event.tagColor} name={event.tag} />
                      {event.purpose === "primary_check_in" ? (
                        <Badge variant="outline">Primary</Badge>
                      ) : null}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {event.location}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => setSelected(event)}
                        variant="outline"
                      >
                        View
                      </Button>
                      {canEdit ? (
                        <Button
                          className="flex-1"
                          onClick={() => openForm("edit", event)}
                          variant="outline"
                        >
                          Edit
                        </Button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
              <div className="flex flex-col gap-3 border-t border-border/70 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Showing {(events.data.pagination.page - 1) * pageSize + 1}-
                  {Math.min(
                    events.data.pagination.page * pageSize,
                    events.data.pagination.totalCount,
                  )}{" "}
                  of {events.data.pagination.totalCount} events
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    disabled={events.data.pagination.page <= 1}
                    onClick={() =>
                      navigate({
                        page: String(events.data.pagination.page - 1),
                      })
                    }
                    size="sm"
                    variant="outline"
                  >
                    Previous
                  </Button>
                  <span className="font-mono">
                    {events.data.pagination.page}/
                    {events.data.pagination.pageCount}
                  </span>
                  <Button
                    disabled={
                      events.data.pagination.page >=
                      events.data.pagination.pageCount
                    }
                    onClick={() =>
                      navigate({
                        page: String(events.data.pagination.page + 1),
                      })
                    }
                    size="sm"
                    variant="outline"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center">
              <p className="font-medium">No matching hackathon events.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Change the filters or create an event.
              </p>
            </div>
          )}
        </section>
      ) : null}

      {view === "calendar" && events.data ? (
        <EventCalendar
          events={rows.map(asCalendarEvent)}
          initialView={calendarMode}
          initialDate={calendarWindow?.initialDate}
          onOpenEvent={(eventId) =>
            setSelected(rows.find((event) => event.id === eventId) ?? null)
          }
          onRangeChange={({ end, start, view: nextCalendarMode }) => {
            if (
              calendarStart === start &&
              calendarEnd === end &&
              calendarMode === nextCalendarMode
            )
              return;
            navigate({
              calendarEnd: end,
              calendarMode: nextCalendarMode === "day" ? "day" : null,
              calendarStart: start,
              page: null,
            });
          }}
        />
      ) : null}

      {view === "tags" && canEdit ? (
        tags.isPending ? (
          <Card>
            <CardContent className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading tags…
            </CardContent>
          </Card>
        ) : tags.isError ? (
          <Card className="border-destructive/40">
            <CardContent className="py-6 text-destructive">
              {tags.error.message}
            </CardContent>
          </Card>
        ) : selectedHackathon ? (
          <EventTagManagement
            description="Set the label, color, and default points for this hackathon's events."
            headerActions={
              <HackathonTagImportDialog
                hackathonId={selectedHackathon.id}
                onImported={refresh}
              />
            }
            onArchive={async (tagId) => {
              await archiveTag.mutateAsync({
                hackathonId: selectedHackathon.id,
                tagId,
              });
              toast.success("Hackathon event tag archived.");
              await refresh();
            }}
            onCreate={async (values) => {
              await createTag.mutateAsync({
                ...values,
                hackathonId: selectedHackathon.id,
              });
              toast.success("Hackathon event tag created.");
              await refresh();
            }}
            onUpdate={async (tagId, values) => {
              await updateTag.mutateAsync({
                ...values,
                hackathonId: selectedHackathon.id,
                tagId,
              });
              toast.success("Hackathon event tag updated.");
              await refresh();
            }}
            tags={tagItems}
          />
        ) : null
      ) : null}

      {form ? (
        <HackathonEventFormDialog
          initial={form.initial}
          key={form.key}
          mode={form.mode}
          onOpenChange={(open) => !open && setForm(null)}
          onSubmit={saveEvent}
          open
          tags={tagItems}
        />
      ) : null}

      <Dialog
        onOpenChange={(open) => !open && setSelected(null)}
        open={selected !== null}
      >
        <DialogContent className="max-h-[90svh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.name ?? "Event"}</DialogTitle>
            <DialogDescription>{selected?.description}</DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="grid gap-4">
              <div className="grid gap-3 rounded-lg border border-border/70 bg-background/50 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    When
                  </p>
                  <p className="mt-1 text-sm">
                    {formatClubDateTime(selected.startAt)} –{" "}
                    {formatClubDateTime(selected.endAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Location
                  </p>
                  <p className="mt-1 text-sm">{selected.location}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Attendance
                  </p>
                  <p className="mt-1 font-mono">{selected.attendanceCount}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Feedback
                  </p>
                  <p className="mt-1 font-mono">
                    {!selected.feedbackForm
                      ? "Not linked"
                      : selected.feedback.averageOverall === null
                        ? `${selected.feedback.responseCount} responses`
                        : `${selected.feedback.averageOverall.toFixed(2)} / 5 · ${selected.feedback.responseCount} responses`}
                  </p>
                </div>
              </div>
              {selected.attendanceCount > 0 ? (
                <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <p>
                    Retained attendance history prevents this event from being
                    deleted. You can still edit or duplicate it.
                  </p>
                </div>
              ) : null}
              {selected.feedbackForm ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 p-4">
                  <div>
                    <p className="font-medium">Feedback form linked</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Created from the shared event feedback template.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={`/admin/forms/${selected.feedbackForm.formId}`}
                      >
                        <ExternalLink className="size-4" /> Form
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={`/admin/forms/${selected.feedbackForm.formId}/responses`}
                      >
                        Responses
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : canEdit && selected.purpose === "event" ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border/70 p-4">
                  <div>
                    <p className="font-medium">No feedback form linked</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Create one from the shared event feedback template.
                    </p>
                  </div>
                  <Button
                    disabled={provisionFeedback.isPending}
                    onClick={async () => {
                      if (!selectedHackathon) return;
                      await provisionFeedback.mutateAsync({
                        eventId: selected.id,
                        hackathonId: selectedHackathon.id,
                      });
                      toast.success("Feedback form created and linked.");
                      setSelected(null);
                      await refresh();
                    }}
                    variant="outline"
                  >
                    {provisionFeedback.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    Create feedback form
                  </Button>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <IntegrationStatus
                  health={selected.discord.state ?? "unknown"}
                  label="Discord"
                />
                <IntegrationStatus
                  health={selected.google.state ?? "unknown"}
                  label="Google"
                />
              </div>
              {canEdit &&
              selected.discord.state === "unknown" &&
              !selected.discord.id &&
              !selected.deletionIntentAt ? (
                <div className="grid gap-3 rounded-lg border border-[hsl(var(--chart-3)/0.35)] bg-[hsl(var(--chart-3)/0.08)] p-4">
                  <div>
                    <p className="font-medium">
                      Discord creation outcome is unknown
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Review live candidates before creating another Discord
                      event.
                    </p>
                  </div>
                  {!discordReview ? (
                    <Button
                      disabled={discordAction !== null}
                      onClick={() =>
                        void runDiscordAction("review", async () => {
                          if (!selectedHackathon) return;
                          setDiscordReview(
                            await utils.hackathonEvent.listDiscordRepairCandidates.fetch(
                              {
                                eventId: selected.id,
                                hackathonId: selectedHackathon.id,
                              },
                            ),
                          );
                        })
                      }
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {discordAction === "review" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      Review Discord candidates
                    </Button>
                  ) : (
                    <div className="grid gap-3">
                      {discordReview.candidates.length ? (
                        <div className="grid gap-2">
                          {discordReview.candidates.map((candidate) => (
                            <div
                              className="grid gap-2 rounded-md border border-white/10 bg-background/60 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                              key={candidate.id}
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {candidate.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {candidate.entityType} · {candidate.id}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Starts {formatClubDateTime(candidate.startAt)}
                                </p>
                              </div>
                              <Button
                                disabled={discordAction !== null}
                                onClick={() =>
                                  void runDiscordAction(
                                    `link:${candidate.id}`,
                                    () =>
                                      finishDiscordResolution({
                                        candidateId: candidate.id,
                                        mode: "link-existing",
                                      }),
                                  )
                                }
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                Link existing
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No matching live Discord events were found.
                        </p>
                      )}
                      <Button
                        disabled={discordAction !== null}
                        onClick={() =>
                          void runDiscordAction("create", () =>
                            finishDiscordResolution({
                              mode: "confirm-create-new",
                            }),
                          )
                        }
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Confirm create new
                      </Button>
                      <div className="grid gap-2 border-t border-white/10 pt-3">
                        <Label htmlFor="hackathon-discord-no-projection">
                          Type{" "}
                          <span className="font-mono">
                            {EVENT_DISCORD_NO_PROJECTION_CONFIRMATION}
                          </span>
                        </Label>
                        <Input
                          id="hackathon-discord-no-projection"
                          onChange={(event) =>
                            setDiscordPhrase(event.target.value)
                          }
                          onPaste={(event) => event.preventDefault()}
                          value={discordPhrase}
                        />
                        <Button
                          disabled={
                            discordAction !== null ||
                            discordPhrase !==
                              EVENT_DISCORD_NO_PROJECTION_CONFIRMATION
                          }
                          onClick={() =>
                            void runDiscordAction("none", () =>
                              finishDiscordResolution({
                                candidateSnapshotToken:
                                  discordReview.snapshotToken,
                                confirmation:
                                  EVENT_DISCORD_NO_PROJECTION_CONFIRMATION,
                                mode: "confirm-no-projection",
                              }),
                            )
                          }
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          Confirm no projection
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
              {selected.deletionIntentAt ||
              selected.discord.lastError ||
              selected.google.lastError ? (
                <div className="grid gap-3 rounded-lg border border-destructive/35 bg-destructive/5 p-4 text-sm">
                  {selected.deletionIntentAt ? (
                    <div className="flex items-start gap-2">
                      <AlertTriangle
                        className="mt-0.5 size-4 shrink-0 text-destructive"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="font-medium">Deletion cleanup pending</p>
                        <p className="text-muted-foreground">
                          Provider records are still being removed. Attendance
                          history remains preserved.
                        </p>
                      </div>
                    </div>
                  ) : null}
                  {selected.discord.lastError ? (
                    <div>
                      <p className="font-medium">Discord sync error</p>
                      <p className="mt-1 break-words text-muted-foreground">
                        {selected.discord.lastError}
                      </p>
                    </div>
                  ) : null}
                  {selected.google.lastError ? (
                    <div>
                      <p className="font-medium">Google Calendar sync error</p>
                      <p className="mt-1 break-words text-muted-foreground">
                        {selected.google.lastError}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            {selected && canEdit ? (
              <>
                {healthNeedsAttention(selected) &&
                !selected.deletionIntentAt ? (
                  <Button
                    disabled={retryingEventId !== null}
                    onClick={() => void retryEvent(selected.id)}
                    variant="secondary"
                  >
                    <RefreshCw
                      className={
                        retryingEventId === selected.id
                          ? "size-4 animate-spin"
                          : "size-4"
                      }
                    />{" "}
                    Retry sync
                  </Button>
                ) : null}
                <Button
                  onClick={() => {
                    openForm("duplicate", selected);
                    setSelected(null);
                  }}
                  variant="outline"
                >
                  <Copy className="size-4" /> Duplicate
                </Button>
                <Button
                  onClick={() => {
                    openForm("edit", selected);
                    setSelected(null);
                  }}
                  variant="outline"
                >
                  <Pencil className="size-4" /> Edit
                </Button>
                <Button
                  disabled={!canDeleteHackathonEvent(selected.attendanceCount)}
                  onClick={() => {
                    setDeleting(selected);
                    setSelected(null);
                  }}
                  variant="destructive"
                >
                  <Trash2 className="size-4" /> Delete
                </Button>
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => !open && setDeleting(null)}
        open={deleting !== null}
      >
        <DialogContent className="max-w-lg border-destructive/30">
          <DialogHeader>
            <DialogTitle>Delete {deleting?.name ?? "event"}?</DialogTitle>
            <DialogDescription>
              This removes the event after provider cleanup, which may finish
              asynchronously.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              disabled={deleteEvent.isPending}
              onClick={() => setDeleting(null)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={deleteEvent.isPending}
              onClick={() => void removeEvent()}
              variant="destructive"
            >
              {deleteEvent.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}{" "}
              Delete event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
