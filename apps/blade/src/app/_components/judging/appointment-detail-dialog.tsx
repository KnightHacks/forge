"use client";

import { ChevronDown } from "lucide-react";

import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { Skeleton } from "@forge/ui/skeleton";

import type { BoardAppointment } from "./schedule-board";
import {
  appointmentStatusLabels,
  appointmentStatusStyles,
  judgingTime,
} from "~/lib/judging/schedule-display";
import { api } from "~/trpc/react";

export function AppointmentDetailDialog({
  appointment,
  hackathonId,
  onMove,
  onOpenChange,
  onViewItinerary,
  open,
  roomLabel,
  timeZone,
}: {
  appointment: BoardAppointment | null;
  hackathonId: string;
  onMove: () => void;
  onOpenChange: (open: boolean) => void;
  onViewItinerary: () => void;
  open: boolean;
  roomLabel: string;
  timeZone: string;
}) {
  const results = api.judging.getAppointmentResults.useQuery(
    {
      appointmentId: appointment?.id ?? "00000000-0000-4000-8000-000000000000",
      hackathonId,
    },
    {
      enabled:
        open && appointment !== null && !appointment.id.startsWith("preview-"),
      refetchInterval: open ? 5000 : false,
    },
  );

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-2xl overflow-y-auto overscroll-contain p-4 sm:p-6 [&>button]:right-2 [&>button]:top-2 [&>button]:size-11">
        <DialogHeader>
          <DialogTitle className="break-words pr-9 text-base sm:text-lg">
            {appointment?.title ?? "Appointment"}
          </DialogTitle>
          <DialogDescription>
            {appointment?.challengeLabel ?? "Judging appointment"}
          </DialogDescription>
        </DialogHeader>
        {appointment ? (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {appointmentStatusLabels[appointment.status]}
              </Badge>
              <span className="text-muted-foreground">
                {judgingTime(appointment.startsAt, timeZone)} to{" "}
                {judgingTime(appointment.endsAt, timeZone)} · {roomLabel}
              </span>
            </div>

            {!appointment.id.startsWith("preview-") ? (
              results.isLoading ? (
                <div
                  aria-label="Loading appointment results"
                  className="space-y-3"
                >
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-28 w-full" />
                </div>
              ) : results.error ? (
                <p
                  className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive"
                  role="alert"
                >
                  {results.error.message}
                </p>
              ) : (
                <section
                  className="space-y-3"
                  aria-labelledby="appointment-results-heading"
                >
                  <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-white/10 bg-background/60 p-4">
                    <div>
                      <h3
                        className="font-semibold"
                        id="appointment-results-heading"
                      >
                        Appointment results
                      </h3>
                      <p className="mt-1 text-muted-foreground">
                        Average from {results.data?.completeJudgeCount ?? 0}{" "}
                        complete judge
                        {(results.data?.completeJudgeCount ?? 0) === 1
                          ? ""
                          : "s"}
                      </p>
                    </div>
                    <span className="font-mono text-3xl font-semibold">
                      {results.data?.average === null
                        ? "No score"
                        : results.data?.average.toFixed(2)}
                    </span>
                  </div>

                  {results.data?.judges.length ? (
                    <div className="divide-y divide-border/60 overflow-hidden rounded-md border border-white/10 bg-background/60">
                      {results.data.judges.map((judge) => (
                        <details className="group p-4" key={judge.id}>
                          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                            <span className="min-w-0">
                              <span className="break-words font-semibold">
                                {judge.displayName}
                              </span>
                              <span className="ml-2 text-xs capitalize text-muted-foreground">
                                {judge.kind} judge
                              </span>
                            </span>
                            <Badge
                              className={
                                judge.status === "complete"
                                  ? appointmentStatusStyles.complete
                                  : appointmentStatusStyles.incomplete
                              }
                              variant="outline"
                            >
                              {judge.status === "complete"
                                ? "Complete"
                                : "Partial"}
                            </Badge>
                            <ChevronDown
                              className="size-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                              aria-hidden="true"
                            />
                          </summary>
                          {judge.status === "complete" ? (
                            <div className="mt-4 space-y-4 border-t border-border/60 pt-4">
                              <div className="grid gap-2 sm:grid-cols-2">
                                {judge.ratings.map((rating) => (
                                  <div
                                    className="flex items-center justify-between gap-3 rounded-md border border-white/10 px-3 py-2"
                                    key={rating.itemId}
                                  >
                                    <span>{rating.label}</span>
                                    <span className="font-mono font-semibold">
                                      {rating.value} / 5
                                    </span>
                                  </div>
                                ))}
                              </div>
                              {judge.responses.map((response) => (
                                <article
                                  className="space-y-1"
                                  key={response.itemId}
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h4 className="font-medium">
                                      {response.label}
                                    </h4>
                                    <Badge variant="outline">
                                      {response.isPublic
                                        ? "Marked for hacker sharing"
                                        : "Internal"}
                                    </Badge>
                                  </div>
                                  <p className="whitespace-pre-wrap break-words leading-6 text-muted-foreground">
                                    {response.value || "No response"}
                                  </p>
                                </article>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-3 border-t border-border/60 pt-3 text-muted-foreground">
                              This judge has not submitted a complete
                              evaluation. Partial answers stay hidden.
                            </p>
                          )}
                        </details>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-md border border-dashed border-white/15 p-4 text-muted-foreground">
                      {appointment.status === "complete" &&
                      results.data?.hasOtherSessionResults
                        ? "This card reflects an earlier project result. No submissions are linked to this appointment."
                        : "No judge submissions are linked to this appointment yet."}
                    </p>
                  )}
                </section>
              )
            ) : null}

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                className="min-h-11"
                onClick={onViewItinerary}
                variant="outline"
              >
                View project itinerary
              </Button>
              {appointment.canMove ? (
                <Button className="min-h-11" onClick={onMove}>
                  Reassign appointment
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
