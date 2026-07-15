"use client";

import { useState } from "react";
import {
  CalendarClock,
  Download,
  MapPin,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { MarkdownContent } from "@forge/ui/markdown-content";
import { EVENT_DISCORD_NO_PROJECTION_CONFIRMATION } from "@forge/validators";

import type { EventAdminAccess, EventDetailData } from "./types";
import { api } from "~/trpc/react";
import { EventFeedbackPanel } from "./event-feedback-panel";
import {
  audienceLabel,
  EventTag,
  formatEventDateTime,
  IntegrationStatus,
} from "./event-presenters";

function EventFeedbackAdmin({
  access,
  event,
}: {
  access: Pick<
    EventAdminAccess,
    "canEdit" | "canRead" | "canReadResponses" | "isOfficer"
  >;
  event: { id: string; name: string };
}) {
  const [excludedResponseIds, setExcludedResponseIds] = useState<string[]>([]);
  const feedback = api.event.getEventFeedback.useQuery({
    eventId: event.id,
    excludedResponseIds,
  });
  const exportQuery = api.event.exportEventFeedback.useQuery(
    { eventId: event.id },
    { enabled: false },
  );
  const addQuestion = api.event.addEventFeedbackQuestion.useMutation();

  if (feedback.isLoading) {
    return (
      <section className="rounded-md border border-white/10 bg-background/60 p-4 lg:col-span-2">
        <p className="text-sm text-muted-foreground" role="status">
          Loading event feedback…
        </p>
      </section>
    );
  }
  if (feedback.error || !feedback.data) return null;

  const data = feedback.data;
  const distribution = (key: "fun" | "learning" | "overall") =>
    [1, 2, 3, 4, 5].map(
      (rating) => data.ratings[key].distribution[rating as 1 | 2 | 3 | 4 | 5],
    );
  const responses = "responses" in data ? data.responses : [];

  async function exportCsv() {
    const result = await exportQuery.refetch();
    if (!result.data) return;
    const url = URL.createObjectURL(
      new Blob([result.data], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `event-${event.id}-feedback.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-md border border-white/10 bg-background/60 p-3 sm:p-4 lg:col-span-2">
      <EventFeedbackPanel
        access={{
          canEditQuestions: access.canEdit,
          canReadResponses: access.canReadResponses === true,
          isOfficer: access.isOfficer,
        }}
        eventId={event.id}
        eventName={event.name}
        excludedResponseIds={excludedResponseIds}
        metrics={{
          averages: {
            fun: data.ratings.fun.average ?? 0,
            learning: data.ratings.learning.average ?? 0,
            overall: data.ratings.overall.average ?? 0,
          },
          customQuestionSummaries: data.customQuestionSummaries,
          discovery: Object.entries(data.discovery).map(([label, count]) => ({
            count,
            label,
          })),
          distributions: {
            fun: distribution("fun"),
            learning: distribution("learning"),
            overall: distribution("overall"),
          },
          includedCount: data.includedCount,
          locallyExcludedCount: data.excludedCount,
        }}
        onAddQuestion={() => {
          const prompt = window.prompt("Event-specific feedback question");
          if (!prompt?.trim()) return;
          addQuestion.mutate({
            eventId: event.id,
            question: {
              id: crypto.randomUUID(),
              maxLength: 2_000,
              prompt: prompt.trim(),
              required: false,
              retired: false,
              type: "paragraph",
            },
          });
        }}
        onExcludedResponseIdsChange={setExcludedResponseIds}
        onExportCsv={() => void exportCsv()}
        responses={responses.map((response) => ({
          answers: {
            customAnswers: response.answers.customAnswers,
            discovery: response.answers.discovery,
            discoveryOther: response.answers.discoveryOther,
            fun: response.answers.fun,
            improve: response.answers.improve ?? "",
            learning: response.answers.learning,
            overall: response.answers.overall,
            worked: response.answers.worked ?? "",
          },
          member: {
            id: response.memberId,
            name: String(response.memberName),
          },
          responseId: response.responseId,
          submittedAt: new Date(response.submittedAt).toISOString(),
        }))}
      />
    </section>
  );
}

function DetailSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-md border border-white/10 bg-background/60 p-3 sm:p-4">
      <h3 className="mb-3 text-base font-semibold">{title}</h3>
      {children}
    </section>
  );
}

export function EventDetailDialog({
  access,
  detail,
  onChanged,
  onClose,
  onDelete,
  onEdit,
  onExport,
  onLoadDiscordCandidates,
  onRemoveAttendance,
  onRepair,
  onResolveDiscord,
}: {
  access: Pick<
    EventAdminAccess,
    "canEdit" | "canRead" | "canReadResponses" | "isOfficer"
  >;
  detail: EventDetailData;
  onChanged: () => void;
  onClose: () => void;
  onDelete?: (eventId: string) => Promise<boolean> | boolean;
  onEdit?: () => void;
  onExport?: (eventId: string) => Promise<void> | void;
  onLoadDiscordCandidates?: (eventId: string) => Promise<{
    candidates: {
      entityType: "external" | "stage" | "voice";
      id: string;
      name: string;
      startAt: Date | string;
    }[];
    snapshotToken: string;
  }>;
  onRemoveAttendance?: (attendanceId: string) => Promise<void> | void;
  onRepair?: (
    eventId: string,
    provider: "discord" | "google",
  ) => Promise<void> | void;
  onResolveDiscord?: (
    input:
      | { candidateId: string; eventId: string; mode: "link-existing" }
      | { eventId: string; mode: "confirm-create-new" }
      | {
          candidateSnapshotToken: string;
          confirmation: typeof EVENT_DISCORD_NO_PROJECTION_CONFIRMATION;
          eventId: string;
          mode: "confirm-no-projection";
        },
  ) => Promise<void> | void;
}) {
  const { event, integrations } = detail;
  const canEdit = access.canEdit || access.isOfficer;
  const eventEnded = Date.parse(event.endDateTime) <= Date.now();
  const attendanceCount = detail.attendeesError
    ? event.attendanceCount
    : Math.max(event.attendanceCount, detail.attendees.length);
  const hasAttendance = attendanceCount > 0;
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [discordReview, setDiscordReview] = useState<{
    candidates: {
      entityType: "external" | "stage" | "voice";
      id: string;
      name: string;
      startAt: Date | string;
    }[];
    snapshotToken: string;
  } | null>(null);
  const [discordPhrase, setDiscordPhrase] = useState("");

  async function runAction(key: string, action: () => Promise<void>) {
    setActionError(null);
    setPendingAction(key);
    try {
      await action();
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "The event action failed.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        aria-label="Event details"
        className="inset-0 left-0 top-0 h-[100svh] max-h-none w-full max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-0 bg-background p-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[90svh] sm:max-w-4xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:border [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center sm:[&>button]:h-8 sm:[&>button]:w-8"
      >
        <DialogHeader className="border-b border-border/70 bg-card/95 px-4 py-4 pr-16 text-left sm:px-6 sm:pr-12">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <EventTag color={event.tagColor} name={event.tag} />
                {event.legacy && (
                  <Badge variant="outline">Legacy history</Badge>
                )}
              </div>
              <DialogTitle className="sr-only">Event details</DialogTitle>
              <h2 className="break-words text-xl font-semibold sm:text-2xl">
                {event.name}
              </h2>
              <DialogDescription>
                {event.internal ? "Internal event" : "Club event"}
              </DialogDescription>
            </div>
            {canEdit && (
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={onEdit}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit event
              </Button>
            )}
          </div>
        </DialogHeader>

        <div
          data-event-detail-layout="sectioned"
          className="grid min-w-0 gap-3 overflow-y-auto p-3 sm:gap-4 sm:p-6 lg:grid-cols-2"
        >
          {actionError && (
            <div
              role="alert"
              className="rounded-md border border-destructive/35 bg-destructive/10 p-3 text-sm text-destructive lg:col-span-2"
            >
              {actionError}
            </div>
          )}
          <DetailSection title="Overview">
            <MarkdownContent className="text-sm leading-6 text-muted-foreground">
              {event.description || "No description provided."}
            </MarkdownContent>
          </DetailSection>

          <DetailSection title="Schedule & location">
            <dl className="grid gap-3 text-sm">
              <div className="flex min-w-0 gap-3">
                <CalendarClock
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <dt className="text-muted-foreground">Starts</dt>
                  <dd>{formatEventDateTime(event.startDateTime)}</dd>
                  <dt className="mt-2 text-muted-foreground">Ends</dt>
                  <dd>{formatEventDateTime(event.endDateTime)}</dd>
                </div>
              </div>
              <div className="flex min-w-0 gap-3">
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <dt className="text-muted-foreground">Location</dt>
                  <dd className="break-words">{event.location}</dd>
                </div>
              </div>
            </dl>
          </DetailSection>

          <DetailSection title="Audience & points">
            <dl className="grid gap-3 text-sm">
              <div className="flex gap-3">
                <ShieldCheck
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div>
                  <dt className="text-muted-foreground">Audience</dt>
                  <dd>{audienceLabel(event.audience)}</dd>
                  {event.roles.length > 0 && (
                    <dd className="mt-1 text-muted-foreground">
                      {event.roles.map((role) => role.name).join(", ")}
                    </dd>
                  )}
                </div>
              </div>
              <div>
                <dt className="text-muted-foreground">Points per check-in</dt>
                <dd className="font-mono">{event.points}</dd>
              </div>
            </dl>
          </DetailSection>

          <DetailSection title="Integration health">
            <div className="grid gap-3">
              {event.legacy && (
                <p className="rounded-md border border-white/10 bg-card/50 p-3 text-sm text-muted-foreground">
                  Historical Legacy event. Provider synchronization status is
                  unavailable and repair is intentionally disabled.
                </p>
              )}
              {!event.legacy && eventEnded && (
                <p className="rounded-md border border-white/10 bg-card/50 p-3 text-sm text-muted-foreground">
                  Provider health is no longer tracked after an event ends.
                  Discord and Google Calendar repair are intentionally disabled.
                </p>
              )}
              {!event.legacy && !eventEnded && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <IntegrationStatus
                      health={integrations.discord.health}
                      label="Discord"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      {integrations.discord.url && (
                        <Button asChild type="button" size="sm" variant="ghost">
                          <a
                            href={integrations.discord.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open Discord event
                          </a>
                        </Button>
                      )}
                      {canEdit &&
                        (integrations.discord.health !== "unknown" ||
                          integrations.discord.url !== null) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={pendingAction !== null}
                            onClick={() =>
                              void runAction("repair-discord", async () => {
                                await onRepair?.(event.id, "discord");
                              })
                            }
                          >
                            <RefreshCw
                              className="mr-2 h-4 w-4"
                              aria-hidden="true"
                            />
                            {integrations.discord.health === "synced"
                              ? "Reapply Discord"
                              : "Repair Discord"}
                          </Button>
                        )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <IntegrationStatus
                      health={integrations.google.health}
                      label="Google Calendar"
                    />
                    {canEdit && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pendingAction !== null}
                        onClick={() =>
                          void runAction("repair-google", async () => {
                            await onRepair?.(event.id, "google");
                          })
                        }
                      >
                        <RefreshCw
                          className="mr-2 h-4 w-4"
                          aria-hidden="true"
                        />
                        {integrations.google.health === "synced"
                          ? "Reapply Google Calendar"
                          : "Repair Google Calendar"}
                      </Button>
                    )}
                  </div>
                </>
              )}
              {canEdit &&
                !event.legacy &&
                !eventEnded &&
                integrations.discord.health === "unknown" &&
                integrations.discord.url === null && (
                  <div className="grid gap-3 rounded-md border border-[hsl(var(--chart-3)/0.35)] bg-[hsl(var(--chart-3)/0.08)] p-3">
                    <div>
                      <p className="text-sm font-medium">
                        Discord creation outcome is unknown
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Review live candidates before creating another Discord
                        event.
                      </p>
                    </div>
                    {!discordReview ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pendingAction !== null}
                        onClick={() =>
                          void runAction("review-discord", async () => {
                            if (!onLoadDiscordCandidates) return;
                            setDiscordReview(
                              await onLoadDiscordCandidates(event.id),
                            );
                          })
                        }
                      >
                        Review Discord candidates
                      </Button>
                    ) : (
                      <div className="grid gap-3">
                        {discordReview.candidates.length > 0 ? (
                          <div className="grid gap-2">
                            {discordReview.candidates.map((candidate) => (
                              <div
                                key={candidate.id}
                                className="grid gap-2 rounded-md border border-white/10 bg-background/60 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">
                                    {candidate.name}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {candidate.entityType} · {candidate.id}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Starts{" "}
                                    {formatEventDateTime(candidate.startAt)}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={pendingAction !== null}
                                  onClick={() =>
                                    void runAction(
                                      `link-${candidate.id}`,
                                      async () => {
                                        await onResolveDiscord?.({
                                          candidateId: candidate.id,
                                          eventId: event.id,
                                          mode: "link-existing",
                                        });
                                      },
                                    )
                                  }
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
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={pendingAction !== null}
                          onClick={() =>
                            void runAction("create-discord", async () => {
                              await onResolveDiscord?.({
                                eventId: event.id,
                                mode: "confirm-create-new",
                              });
                            })
                          }
                        >
                          Confirm create new
                        </Button>
                        <div className="grid gap-2 border-t border-white/10 pt-3">
                          <Label htmlFor="discord-no-projection-confirmation">
                            Type{" "}
                            <span className="font-mono">
                              {EVENT_DISCORD_NO_PROJECTION_CONFIRMATION}
                            </span>
                          </Label>
                          <Input
                            id="discord-no-projection-confirmation"
                            value={discordPhrase}
                            onChange={(inputEvent) =>
                              setDiscordPhrase(inputEvent.target.value)
                            }
                            onPaste={(pasteEvent) =>
                              pasteEvent.preventDefault()
                            }
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={
                              pendingAction !== null ||
                              discordPhrase !==
                                EVENT_DISCORD_NO_PROJECTION_CONFIRMATION
                            }
                            onClick={() =>
                              void runAction("confirm-no-discord", async () => {
                                await onResolveDiscord?.({
                                  candidateSnapshotToken:
                                    discordReview.snapshotToken,
                                  confirmation:
                                    EVENT_DISCORD_NO_PROJECTION_CONFIRMATION,
                                  eventId: event.id,
                                  mode: "confirm-no-projection",
                                });
                              })
                            }
                          >
                            Confirm no projection
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </DetailSection>

          <section className="rounded-md border border-white/10 bg-background/60 p-3 sm:p-4 lg:col-span-2">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">Attendance</h3>
                <p className="text-sm text-muted-foreground">
                  {attendanceCount} checked in
                </p>
              </div>
              {access.canRead && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onExport?.(event.id)}
                >
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                  Export attendance
                </Button>
              )}
            </div>

            {detail.attendeesError ? (
              <div
                role="alert"
                className="grid gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm"
              >
                <p>
                  Attendance could not be loaded. No empty-state assumption was
                  made; retry before making attendance decisions.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="justify-self-start"
                  onClick={onChanged}
                >
                  Retry attendance
                </Button>
              </div>
            ) : detail.attendees.length === 0 ? (
              <div className="rounded-md border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">
                No members have checked in.
              </div>
            ) : (
              <div className="grid gap-2">
                {detail.attendees.map((attendee) => (
                  <div
                    key={attendee.attendanceId ?? attendee.memberId}
                    className="grid min-w-0 gap-3 rounded-md border border-white/10 bg-card/50 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {attendee.name}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        @{attendee.discordUsername} ·{" "}
                        {attendee.pointsAwarded ?? "Unknown"} points
                      </p>
                      {(attendee.checkedInAt || attendee.checkedInBy) && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {attendee.checkedInAt
                            ? `Checked in ${formatEventDateTime(attendee.checkedInAt)}`
                            : "Check-in time unavailable"}
                          {attendee.checkedInBy
                            ? ` · Operator ${attendee.checkedInBy}`
                            : ""}
                        </p>
                      )}
                    </div>
                    {canEdit && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pendingAction !== null}
                        onClick={() => {
                          const attendanceId = attendee.attendanceId;
                          if (!attendanceId) return;
                          void runAction("remove-attendance", async () => {
                            await onRemoveAttendance?.(attendanceId);
                            onChanged();
                          });
                        }}
                      >
                        Remove {attendee.name}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <EventFeedbackAdmin access={access} event={event} />

          {canEdit && (
            <section className="rounded-md border border-destructive/25 bg-destructive/5 p-3 sm:p-4 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">Delete event</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {hasAttendance
                      ? "Events with attendance cannot be deleted."
                      : event.deletionPending
                        ? "Blade retained this event because external cleanup still needs attention. Retry deletion to continue cleanup."
                        : "Deletes the event after both external projections are removed."}
                  </p>
                </div>
                {!hasAttendance && (
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={pendingAction !== null}
                    onClick={() =>
                      void runAction("delete-event", async () => {
                        if ((await onDelete?.(event.id)) === true) onChanged();
                      })
                    }
                  >
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                    {event.deletionPending
                      ? "Retry deletion cleanup"
                      : "Confirm delete event"}
                  </Button>
                )}
              </div>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
