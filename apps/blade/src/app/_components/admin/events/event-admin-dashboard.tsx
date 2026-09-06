"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowDownAZ,
  ArrowDownUp,
  CalendarDays,
  Copy,
  History,
  List,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Tags,
  X,
} from "lucide-react";

import { cn } from "@forge/ui";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Input } from "@forge/ui/input";
import { toast } from "@forge/ui/toast";

import type { EventFormValue } from "./event-form-dialog";
import type { AdminEventInput, EventAdminView } from "./params";
import type {
  EventAdminDashboardProps,
  EventListItem,
  EventTagItem,
} from "./types";
import {
  AdminPageHeader,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";
import {
  RouteTransitionLink as Link,
  useNavigationRouter as useRouter,
} from "~/app/_components/shared/route-transition-link";
import { ADMIN_PAGE_EYEBROWS } from "~/consts/admin-page-eyebrows";
import {
  clubDateTimeInput,
  clubUtcOffset,
  localNewYorkDateTime,
} from "~/lib/dates";
import { api } from "~/trpc/react";
import { EventCalendar } from "./event-calendar";
import { EventDetailDialog } from "./event-detail-dialog";
import { EventFilters } from "./event-filters";
import { EventFormDialog } from "./event-form-dialog";
import {
  audienceLabel,
  EventTag,
  formatEventDateTime,
  IntegrationStatus,
} from "./event-presenters";
import { EventTagManagement } from "./event-tag-management";
import { EventWorkspaceSections } from "./event-workspace-sections";
import { buildAdminEventSearchParams } from "./params";

interface EventAdminActions {
  onArchiveTag?: (tagId: string) => Promise<void> | void;
  onCreateEvent?: (value: EventFormValue) => Promise<void> | void;
  onCreateTag?: (values: {
    color: string;
    defaultPoints: number;
    name: string;
  }) => Promise<void> | void;
  onRepair?: (
    eventId: string,
    provider: "discord" | "google",
  ) => Promise<void> | void;
  onUpdateTag?: (
    tagId: string,
    values: { color: string; defaultPoints: number; name: string },
  ) => Promise<void> | void;
  onUpdateEvent?: (
    eventId: string,
    value: EventFormValue,
  ) => Promise<void> | void;
  tags?: EventTagItem[];
}

function offsetForInstant(value: string) {
  const offset = clubUtcOffset(value);
  return offset === "-04:00" || offset === "-05:00" ? offset : undefined;
}

function viewHref(input: AdminEventInput, view: EventAdminView) {
  return `/admin/events?${buildAdminEventSearchParams(
    { ...input, view },
    null,
  ).toString()}`;
}

function EventSections({
  access,
  input,
}: Pick<EventAdminDashboardProps, "access" | "input">) {
  const sections: {
    href: string;
    icon: typeof List;
    label: string;
    view: EventAdminView;
  }[] = [];
  if (access.canRead || access.canEdit || access.isOfficer) {
    sections.push(
      {
        href: viewHref(input, "list"),
        icon: List,
        label: "List",
        view: "list",
      },
      {
        href: viewHref(input, "calendar"),
        icon: CalendarDays,
        label: "Calendar",
        view: "calendar",
      },
    );
  }
  if (access.canEdit || access.isOfficer) {
    sections.push({
      href: viewHref(input, "tags"),
      icon: Tags,
      label: "Tags",
      view: "tags",
    });
  }

  return (
    <EventWorkspaceSections
      current={input.view}
      sections={sections.map(({ href, icon, label, view }) => ({
        href,
        icon,
        label,
        value: view,
      }))}
    />
  );
}

function healthNeedsAttention(event: EventListItem) {
  return (
    event.deletionPending === true ||
    event.discordHealth !== "synced" ||
    event.googleHealth !== "synced"
  );
}

export function eventUpdateFeedback(status?: string) {
  if (status === "legacy") {
    return {
      message:
        "Legacy event updated in Blade. Historical calendars were not changed.",
      tone: "success" as const,
    };
  }
  if (status === "unchanged") {
    return {
      message: "No event changes to save.",
      tone: "success" as const,
    };
  }
  if (!status || status === "published") {
    return { message: "Event updated.", tone: "success" as const };
  }
  return {
    message:
      status === "syncing"
        ? "The update is saved, but another synchronization is still running."
        : "The update is saved in Blade, but an external provider needs attention.",
    tone: "warning" as const,
  };
}

function withoutValue<T extends string>(values: T[], value: T) {
  return values.filter((candidate) => candidate !== value);
}

function EventListView({
  access,
  data,
  input,
  onChangeInput,
  onDuplicate,
  onEdit,
  onOpen,
  onRepair,
  repairingEventId,
}: {
  access: EventAdminDashboardProps["access"];
  data: NonNullable<EventAdminDashboardProps["data"]>;
  input: AdminEventInput;
  onChangeInput: (input: AdminEventInput) => void;
  onDuplicate: (event: EventListItem) => void;
  onEdit: (event: EventListItem) => void;
  onOpen: (eventId: string) => void;
  onRepair?: EventAdminActions["onRepair"];
  repairingEventId: string | null;
}) {
  const canEdit = access.canEdit || access.isOfficer;
  const tracksIntegrationHealth = input.timing !== "past";
  const first = data.pagination.totalCount
    ? (data.pagination.page - 1) * data.pagination.pageSize + 1
    : 0;
  const last = Math.min(
    data.pagination.page * data.pagination.pageSize,
    data.pagination.totalCount,
  );

  if (data.events.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-white/10 bg-card/80 p-10 text-center shadow-xl shadow-black/15">
        <h2 className="text-lg font-semibold">No events found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Change the search or filters to see more events.
        </p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-white/10 bg-card/95 shadow-2xl shadow-black/25">
      <div className="hidden overflow-x-auto md:block">
        <table
          className="w-full min-w-[72rem] text-left text-sm"
          aria-label="Events"
        >
          <thead className="border-b border-border/70 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Event</th>
              <th className="px-4 py-3 font-medium">Audience</th>
              <th className="px-4 py-3 font-medium">Starts</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 text-right font-medium">Attendance</th>
              <th className="px-4 py-3 text-right font-medium">Feedback</th>
              <th className="px-4 py-3 font-medium">
                {tracksIntegrationHealth
                  ? "Integration health"
                  : "Provider status"}
              </th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {data.events.map((event) => (
              <tr key={event.id} className="hover:bg-background/40">
                <td className="px-4 py-4">
                  <button
                    type="button"
                    className="max-w-64 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => onOpen(event.id)}
                  >
                    <span className="block truncate font-medium">
                      {event.name}
                    </span>
                    <span className="mt-1 block">
                      <EventTag color={event.tagColor} name={event.tag} />
                    </span>
                  </button>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {audienceLabel(event.audience)}
                    </Badge>
                    {event.internal && (
                      <Badge variant="outline">Internal</Badge>
                    )}
                    {event.legacy && <Badge variant="outline">Legacy</Badge>}
                    {event.deletionPending && (
                      <Badge variant="destructive">Deletion pending</Badge>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-4">
                  {formatEventDateTime(event.startDateTime)}
                </td>
                <td className="max-w-48 truncate px-4 py-4">
                  {event.location}
                </td>
                <td className="px-4 py-4 text-right font-mono">
                  {event.attendanceCount}
                </td>
                <td className="px-4 py-4 text-right">
                  <button
                    type="button"
                    className="min-h-9 rounded-md px-2 font-mono text-sm hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => onOpen(event.id)}
                    aria-label={`Open feedback for ${event.name}`}
                  >
                    {event.feedback?.averageOverall == null
                      ? "—"
                      : `${event.feedback.averageOverall.toFixed(2)} / 5`}
                  </button>
                </td>
                <td className="px-4 py-4">
                  {tracksIntegrationHealth ? (
                    <div className="grid gap-1.5">
                      {healthNeedsAttention(event) && (
                        <span className="text-sm font-medium text-destructive">
                          Needs attention
                        </span>
                      )}
                      <IntegrationStatus
                        health={event.discordHealth}
                        label="Discord"
                      />
                      <IntegrationStatus
                        health={event.googleHealth}
                        label="Google Calendar"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Provider health is no longer tracked.
                    </span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      aria-label={`View ${event.name}`}
                      onClick={() => onOpen(event.id)}
                    >
                      View
                    </Button>
                    {canEdit && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit(event)}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          Edit event
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onDuplicate(event)}
                        >
                          <Copy className="h-4 w-4" aria-hidden="true" />
                          Duplicate event
                        </Button>
                        {tracksIntegrationHealth &&
                          event.googleHealth !== "synced" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={repairingEventId !== null}
                              onClick={() => onRepair?.(event.id, "google")}
                            >
                              <RefreshCw
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  repairingEventId === event.id &&
                                    "animate-spin",
                                )}
                                aria-hidden="true"
                              />
                              {repairingEventId === event.id
                                ? "Repairing..."
                                : "Repair Google Calendar"}
                            </Button>
                          )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid min-w-0 gap-2 p-2 md:hidden">
        {data.events.map((event) => (
          <article
            key={event.id}
            className="relative min-w-0 overflow-hidden rounded-md border border-white/10 bg-background/60 p-3 pl-4"
          >
            <span
              className="absolute inset-y-0 left-0 w-1"
              style={{ backgroundColor: event.tagColor }}
              aria-hidden="true"
            />
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold">
                  {event.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatEventDateTime(event.startDateTime)}
                </p>
              </div>
              <Badge variant="secondary">{event.attendanceCount}</Badge>
            </div>
            <p className="mt-2 truncate text-sm text-muted-foreground">
              {event.location}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <EventTag color={event.tagColor} name={event.tag} />
              <Badge variant="outline">{audienceLabel(event.audience)}</Badge>
              {tracksIntegrationHealth && healthNeedsAttention(event) && (
                <Badge variant="destructive">Needs attention</Badge>
              )}
              {!tracksIntegrationHealth && (
                <Badge variant="outline">Completed</Badge>
              )}
              {event.deletionPending && (
                <Badge variant="destructive">Deletion pending</Badge>
              )}
              {event.feedback?.averageOverall != null && (
                <Badge variant="outline">
                  Feedback {event.feedback.averageOverall.toFixed(2)} / 5
                </Badge>
              )}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                aria-label={`View ${event.name}`}
                onClick={() => onOpen(event.id)}
              >
                View details
              </Button>
              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => onEdit(event)}
                >
                  Edit event
                </Button>
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t border-border/70 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          Showing {first}-{last} of {data.pagination.totalCount} events
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={data.pagination.page <= 1}
            onClick={() => onChangeInput({ ...input, page: input.page - 1 })}
          >
            Previous
          </Button>
          <span className="font-mono">
            {data.pagination.page}/{data.pagination.pageCount}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={data.pagination.page >= data.pagination.pageCount}
            onClick={() => onChangeInput({ ...input, page: input.page + 1 })}
          >
            Next
          </Button>
        </div>
      </div>
    </section>
  );
}

export function EventAdminDashboard({
  access,
  channels = [],
  data,
  detail,
  input,
  onArchiveTag,
  onCreateEvent,
  onCreateTag,
  onRepair,
  onUpdateEvent,
  onUpdateTag,
  tags = [],
}: EventAdminDashboardProps & EventAdminActions) {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();
  const utils = api.useUtils();
  const createEvent = api.event.createEvent.useMutation();
  const updateEvent = api.event.updateEvent.useMutation();
  const repairIntegration = api.event.repairIntegration.useMutation();
  const resolveDiscordProjection =
    api.event.resolveDiscordProjection.useMutation();
  const deleteEvent = api.event.deleteEvent.useMutation();
  const removeAttendance = api.event.removeAttendance.useMutation();
  const createTag = api.event.createTag.useMutation();
  const updateTag = api.event.updateTag.useMutation();
  const archiveTag = api.event.archiveTag.useMutation();
  const [createOpen, setCreateOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "duplicate" | "edit">(
    "create",
  );
  const [formInitial, setFormInitial] = useState<EventFormValue | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingEventRevision, setEditingEventRevision] = useState<
    number | null
  >(null);
  const [repairingEventId, setRepairingEventId] = useState<string | null>(null);
  const eventOpener = useRef<HTMLElement | null>(null);
  const detailWasOpen = useRef(Boolean(detail));
  const canEdit = access.canEdit || access.isOfficer;
  const canRead = access.canRead || canEdit;

  useEffect(() => {
    if (detailWasOpen.current && !detail) eventOpener.current?.focus();
    detailWasOpen.current = Boolean(detail);
  }, [detail]);

  function eventPayload(value: EventFormValue) {
    const { values } = value;
    return {
      audience:
        values.audience === "roles"
          ? ({ roleIds: values.roleIds, type: "roles" } as const)
          : ({ type: values.audience } as const),
      description: values.description,
      end: localNewYorkDateTime(values.end, values.endOffset),
      internalTarget: values.internal
        ? ({
            channelId: values.channelId ?? "",
            channelType: values.channelType ?? "voice",
            internal: true,
          } as const)
        : ({ internal: false } as const),
      location: values.location,
      name: values.name,
      ...(values.pointOverride === null
        ? {}
        : { pointsOverride: values.pointOverride }),
      start: localNewYorkDateTime(values.start, values.startOffset),
      tagId: values.tagId,
    };
  }

  async function defaultCreate(value: EventFormValue) {
    const result = await createEvent.mutateAsync({
      ...eventPayload(value),
      creationKey: value.creationKey,
    });
    if (result.status === "published") {
      toast.success("Event published.");
      return;
    }
    toast.warning(
      result.status === "syncing"
        ? "The event is saved, but another synchronization is still running."
        : "The event is saved in Blade, but an external provider needs attention.",
    );
    navigate(input, result.eventId);
  }

  async function defaultUpdate(
    eventId: string,
    expectedRevision: number,
    value: EventFormValue,
  ) {
    const result = await updateEvent.mutateAsync({
      ...eventPayload(value),
      eventId,
      expectedRevision,
    });
    const feedback = eventUpdateFeedback(
      "status" in result ? result.status : undefined,
    );
    if (feedback.tone === "success") toast.success(feedback.message);
    else toast.warning(feedback.message);
    if (feedback.tone === "warning") router.refresh();
  }

  async function defaultRepair(
    eventId: string,
    provider: "discord" | "google",
  ) {
    const result = await repairIntegration.mutateAsync({ eventId, provider });
    if (result.status === "published") {
      toast.success("Event integrations synchronized.");
      router.refresh();
      return;
    }
    throw new Error(
      result.status === "syncing"
        ? "Synchronization is already running. Try again shortly."
        : result.status === "legacy"
          ? "Legacy events do not use provider repair."
          : "One or more integrations still need attention.",
    );
  }

  async function repairFromList(
    eventId: string,
    provider: "discord" | "google",
  ) {
    if (repairingEventId) return;
    setRepairingEventId(eventId);
    try {
      if (onRepair) await onRepair(eventId, provider);
      else await defaultRepair(eventId, provider);
    } catch (cause) {
      toast.error(
        cause instanceof Error && cause.message
          ? cause.message
          : "The integration could not be repaired.",
      );
    } finally {
      setRepairingEventId(null);
    }
  }

  function navigate(next: AdminEventInput, eventId: string | null = null) {
    const params = buildAdminEventSearchParams(next, eventId);
    startTransition(() => {
      router.replace(
        `/admin/events${params.size ? `?${params.toString()}` : ""}`,
      );
    });
  }

  function openEvent(eventId: string) {
    if (document.activeElement instanceof HTMLElement) {
      eventOpener.current = document.activeElement;
    }
    navigate(input, eventId);
  }

  function openForm(
    mode: "create" | "duplicate" | "edit",
    event?: EventListItem,
  ) {
    setFormMode(mode);
    setEditingEventId(mode === "edit" && event ? event.id : null);
    setEditingEventRevision(mode === "edit" && event ? event.revision : null);
    setFormInitial(
      event
        ? {
            creationKey: crypto.randomUUID(),
            values: {
              audience: event.audience,
              channelId: event.channelId,
              channelType: event.channelType,
              description: event.description ?? "",
              end: clubDateTimeInput(event.endDateTime),
              endOffset: offsetForInstant(event.endDateTime),
              internal: event.internal,
              location: event.location,
              name: event.name,
              pointOverride: event.points ?? null,
              roleIds: event.roleIds ?? [],
              start: clubDateTimeInput(event.startDateTime),
              startOffset: offsetForInstant(event.startDateTime),
              tagId: tags.find((tag) => tag.name === event.tag)?.id ?? "",
            },
          }
        : null,
    );
    setCreateOpen(true);
  }

  return (
    <main className={adminPageLayoutClassName}>
      <AdminPageHeader
        actions={
          canEdit ? (
            <>
              {access.isOfficer && (
                <Button asChild variant="outline" className="min-h-11">
                  <Link href="/admin/events/feedback-template">
                    Feedback template
                  </Link>
                </Button>
              )}
              <Button
                type="button"
                className="min-h-11 gap-2 self-start lg:self-auto"
                onClick={() => openForm("create")}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create event
              </Button>
            </>
          ) : undefined
        }
        description="Manage club events, provider health, tags, and attendance records."
        eyebrow={ADMIN_PAGE_EYEBROWS.events}
        icon={CalendarDays}
        title="Event management"
      />

      <EventSections access={access} input={input} />

      {canRead &&
        (input.view === "list" || input.view === "calendar") &&
        data && (
          <section className="rounded-lg border border-white/10 bg-card/95 p-3 shadow-xl shadow-black/15 sm:p-4">
            <div className="flex min-w-0 flex-wrap items-end gap-2">
              {input.view === "list" && (
                <div
                  role="group"
                  aria-label="Event timing"
                  className="grid grid-cols-2 rounded-lg border border-white/10 bg-background/60 p-1"
                >
                  <Button
                    type="button"
                    variant={input.timing === "upcoming" ? "primary" : "ghost"}
                    aria-pressed={input.timing === "upcoming"}
                    className="min-h-10 gap-2"
                    onClick={() =>
                      navigate({
                        ...input,
                        direction: "asc",
                        health: [],
                        page: 1,
                        timing: "upcoming",
                      })
                    }
                  >
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    Upcoming
                  </Button>
                  <Button
                    type="button"
                    variant={input.timing === "past" ? "primary" : "ghost"}
                    aria-pressed={input.timing === "past"}
                    className="min-h-10 gap-2"
                    onClick={() =>
                      navigate({
                        ...input,
                        direction: "desc",
                        health: [],
                        page: 1,
                        timing: "past",
                      })
                    }
                  >
                    <History className="h-4 w-4" aria-hidden="true" />
                    Past
                  </Button>
                </div>
              )}
              <form
                className="relative min-w-[14rem] flex-1"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  const query = form.get("query");
                  navigate({
                    ...input,
                    page: 1,
                    query: typeof query === "string" ? query.trim() : "",
                  });
                }}
              >
                <Search
                  className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  name="query"
                  type="search"
                  defaultValue={input.query}
                  aria-label="Search events"
                  placeholder="Search name, description, location, or tag"
                  className="h-11 pl-9"
                />
              </form>
              <EventFilters
                input={input}
                options={data.filterOptions}
                onApply={(next) => navigate(next)}
              />
              <label>
                <span className="sr-only">Sort</span>
                <select
                  aria-label="Sort events"
                  className="h-11 rounded-md border border-input bg-background px-3 pr-10 text-sm text-foreground"
                  value={input.sort}
                  onChange={(event) =>
                    navigate({
                      ...input,
                      page: 1,
                      sort: event.target.value as AdminEventInput["sort"],
                    })
                  }
                >
                  <option value="start">Start time</option>
                  <option value="name">Name</option>
                  <option value="tag">Tag</option>
                  <option value="attendance">Attendance</option>
                </select>
              </label>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 gap-2"
                aria-label={`Sort ${input.direction === "asc" ? "descending" : "ascending"}`}
                onClick={() =>
                  navigate({
                    ...input,
                    direction: input.direction === "asc" ? "desc" : "asc",
                    page: 1,
                  })
                }
              >
                {input.direction === "asc" ? (
                  <ArrowDownAZ className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ArrowDownUp className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
              {input.view === "list" && (
                <label>
                  <span className="sr-only">Page size</span>
                  <select
                    aria-label="Page size"
                    className="h-11 rounded-md border border-input bg-background px-3 pr-10 text-sm text-foreground"
                    value={input.pageSize}
                    onChange={(event) =>
                      navigate({
                        ...input,
                        page: 1,
                        pageSize: Number(
                          event.target.value,
                        ) as AdminEventInput["pageSize"],
                      })
                    }
                  >
                    {[25, 50, 100, 250, 500].map((size) => (
                      <option key={size} value={size}>
                        {size} per page
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {(input.audiences.length > 0 ||
              input.health.length > 0 ||
              input.roleIds.length > 0 ||
              input.tags.length > 0 ||
              input.internal !== "all" ||
              input.startDate ||
              input.endDate) && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                {input.audiences.map((audience) => (
                  <button
                    key={`audience-${audience}`}
                    type="button"
                    className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 bg-background/60 px-3 text-sm"
                    onClick={() =>
                      navigate({
                        ...input,
                        audiences: withoutValue(input.audiences, audience),
                        page: 1,
                      })
                    }
                  >
                    Audience: {audienceLabel(audience)}
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ))}
                {input.tags.map((tag) => (
                  <button
                    key={`tag-${tag}`}
                    type="button"
                    className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 bg-background/60 px-3 text-sm"
                    onClick={() =>
                      navigate({
                        ...input,
                        page: 1,
                        tags: withoutValue(input.tags, tag),
                      })
                    }
                  >
                    Tag: {tag}
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ))}
                {input.health.map((health) => (
                  <button
                    key={`health-${health}`}
                    type="button"
                    className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 bg-background/60 px-3 text-sm"
                    onClick={() =>
                      navigate({
                        ...input,
                        health: withoutValue(input.health, health),
                        page: 1,
                      })
                    }
                  >
                    Health: {health}
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ))}
                {input.roleIds.map((roleId) => (
                  <button
                    key={`role-${roleId}`}
                    type="button"
                    className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 bg-background/60 px-3 text-sm"
                    onClick={() =>
                      navigate({
                        ...input,
                        page: 1,
                        roleIds: withoutValue(input.roleIds, roleId),
                      })
                    }
                  >
                    Role:{" "}
                    {data.filterOptions.roles.find((role) => role.id === roleId)
                      ?.name ?? "Linked role"}
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ))}
                {input.internal !== "all" && (
                  <button
                    type="button"
                    className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 bg-background/60 px-3 text-sm"
                    onClick={() =>
                      navigate({ ...input, internal: "all", page: 1 })
                    }
                  >
                    {input.internal === "internal"
                      ? "Internal"
                      : "Public calendar"}
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
                {input.startDate && (
                  <button
                    type="button"
                    className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 bg-background/60 px-3 text-sm"
                    onClick={() =>
                      navigate({ ...input, page: 1, startDate: undefined })
                    }
                  >
                    From {input.startDate}
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
                {input.endDate && (
                  <button
                    type="button"
                    className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 bg-background/60 px-3 text-sm"
                    onClick={() =>
                      navigate({ ...input, endDate: undefined, page: 1 })
                    }
                  >
                    Through {input.endDate}
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    navigate({
                      ...input,
                      audiences: [],
                      direction: "asc",
                      endDate: undefined,
                      health: [],
                      internal: "all",
                      page: 1,
                      roleIds: [],
                      startDate: undefined,
                      tags: [],
                      timing: "upcoming",
                    })
                  }
                >
                  Reset all
                </Button>
              </div>
            )}
          </section>
        )}

      {isNavigating && (input.view === "list" || input.view === "calendar") ? (
        <div
          aria-live="polite"
          className="flex items-center gap-2 rounded-md border border-white/10 bg-primary/5 px-4 py-2 text-sm text-muted-foreground"
        >
          <Loader2
            className="size-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          Updating events
        </div>
      ) : null}

      {input.view === "list" && canRead && data && (
        <div
          aria-busy={isNavigating}
          className={`transition-opacity duration-150 motion-reduce:transition-none ${isNavigating ? "opacity-70" : ""}`}
        >
          <EventListView
            access={access}
            data={data}
            input={input}
            onChangeInput={(next) => navigate(next)}
            onDuplicate={(event) => openForm("duplicate", event)}
            onEdit={(event) => openForm("edit", event)}
            onOpen={openEvent}
            onRepair={repairFromList}
            repairingEventId={repairingEventId}
          />
        </div>
      )}

      {input.view === "calendar" && canRead && data && (
        <div
          aria-busy={isNavigating}
          className={`transition-opacity duration-150 motion-reduce:transition-none ${isNavigating ? "opacity-70" : ""}`}
        >
          <EventCalendar
            events={data.events}
            initialView={input.calendarMode}
            initialDate={
              input.calendarStart && input.calendarEnd
                ? new Date(
                    (Date.parse(input.calendarStart) +
                      Date.parse(input.calendarEnd)) /
                      2,
                  ).toISOString()
                : undefined
            }
            onOpenEvent={openEvent}
            onRangeChange={({ end, start, view }) => {
              if (
                input.calendarStart === start &&
                input.calendarEnd === end &&
                input.calendarMode === view
              ) {
                return;
              }
              navigate({
                ...input,
                calendarEnd: end,
                calendarMode: view,
                calendarStart: start,
                page: 1,
              });
            }}
          />
        </div>
      )}

      {input.view === "tags" && canEdit && (
        <EventTagManagement
          tags={tags}
          onArchive={
            onArchiveTag ??
            (async (tagId) => {
              await archiveTag.mutateAsync({ tagId });
              toast.success("Event tag archived.");
              router.refresh();
            })
          }
          onCreate={
            onCreateTag ??
            (async (values) => {
              await createTag.mutateAsync(values);
              toast.success("Event tag created.");
              router.refresh();
            })
          }
          onUpdate={
            onUpdateTag ??
            (async (tagId, values) => {
              await updateTag.mutateAsync({ ...values, tagId });
              toast.success("Event tag updated.");
              router.refresh();
            })
          }
        />
      )}

      {detail && canRead && (
        <EventDetailDialog
          access={access}
          detail={detail}
          onChanged={() => router.refresh()}
          onClose={() => navigate(input, null)}
          onDelete={async (eventId) => {
            const result = await deleteEvent.mutateAsync({ eventId });
            if (result.status === "deleted") {
              toast.success("Event deleted.");
              navigate(input, null);
              return true;
            }
            router.refresh();
            throw new Error(
              result.status === "syncing"
                ? "Deletion is waiting for another synchronization. Try again shortly."
                : "Blade retained the event because an external projection could not be removed. Repair deletion and try again.",
            );
          }}
          onEdit={() => {
            const row = data?.events.find(
              (event) => event.id === detail.event.id,
            );
            openForm(
              "edit",
              row ?? {
                attendanceCount: detail.event.attendanceCount,
                audience: detail.event.audience,
                channelId: detail.event.channelId,
                channelType: detail.event.channelType,
                description: detail.event.description,
                deletionPending: detail.event.deletionPending,
                discordHealth: detail.integrations.discord.health,
                endDateTime: detail.event.endDateTime,
                googleHealth: detail.integrations.google.health,
                id: detail.event.id,
                internal: detail.event.internal,
                legacy: detail.event.legacy ?? false,
                location: detail.event.location,
                name: detail.event.name,
                points: detail.event.points,
                revision: detail.event.revision,
                roleIds: detail.event.roles.map((role) => role.id),
                startDateTime: detail.event.startDateTime,
                tag: detail.event.tag,
                tagColor: detail.event.tagColor,
              },
            );
          }}
          onExport={async (eventId) => {
            const csv = await utils.event.exportAttendance.fetch({ eventId });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(
              new Blob([csv], { type: "text/csv;charset=utf-8" }),
            );
            link.download = `event-attendance-${eventId}.csv`;
            link.click();
            URL.revokeObjectURL(link.href);
          }}
          onLoadDiscordCandidates={(eventId) =>
            utils.event.listDiscordRepairCandidates.fetch({ eventId })
          }
          onRemoveAttendance={async (attendanceId) => {
            await removeAttendance.mutateAsync({ attendanceId });
            toast.success("Attendance removed and points corrected.");
            router.refresh();
          }}
          onRepair={async (eventId, provider) => {
            if (onRepair) await onRepair(eventId, provider);
            else await defaultRepair(eventId, provider);
          }}
          onResolveDiscord={async (resolution) => {
            const result =
              await resolveDiscordProjection.mutateAsync(resolution);
            if ("status" in result && result.status !== "published") {
              toast.warning(
                result.status === "syncing"
                  ? "Discord resolution was committed; synchronization is still running."
                  : "Discord resolution was committed; another integration still needs attention.",
              );
              router.refresh();
              return;
            }
            toast.success(
              resolution.mode === "link-existing"
                ? "Existing Discord event linked."
                : resolution.mode === "confirm-no-projection"
                  ? "Discord absence acknowledged."
                  : "New Discord event created.",
            );
            router.refresh();
          }}
        />
      )}

      {canEdit && (
        <EventFormDialog
          initialValue={formInitial}
          channels={channels}
          mode={formMode}
          open={createOpen}
          roles={data?.filterOptions.roles ?? []}
          tags={tags}
          onOpenChange={setCreateOpen}
          onSubmit={async (value) => {
            if (
              formMode === "edit" &&
              editingEventId &&
              editingEventRevision !== null
            ) {
              if (onUpdateEvent) await onUpdateEvent(editingEventId, value);
              else
                await defaultUpdate(
                  editingEventId,
                  editingEventRevision,
                  value,
                );
            } else {
              if (onCreateEvent) await onCreateEvent(value);
              else await defaultCreate(value);
            }
            router.refresh();
          }}
        />
      )}
    </main>
  );
}
