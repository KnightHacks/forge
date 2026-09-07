"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Clock3, RefreshCw } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Checkbox } from "@forge/ui/checkbox";
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

import type { AppointmentSelection } from "./appointment-move-dialog";
import type { BoardAppointment } from "./schedule-board";
import {
  appointmentStatusLabels,
  judgingTime,
} from "~/lib/judging/schedule-display";
import { useJudgingClock } from "~/lib/judging/use-judging-clock";
import { api } from "~/trpc/react";
import { AppointmentMoveDialog } from "./appointment-move-dialog";
import { ScheduleBoard } from "./schedule-board";
import { ScheduleConfiguration } from "./schedule-configuration";

type Data = RouterOutputs["judging"]["listScheduleAdmin"];

export function JudgingSchedulePanel({
  initialData,
  hackathonId,
  timeZone,
}: {
  initialData: Data;
  hackathonId: string;
  timeZone: string;
}) {
  const utils = api.useUtils();
  const query = api.judging.listScheduleAdmin.useQuery(
    { hackathonId },
    { initialData, refetchInterval: 5000, refetchOnMount: false },
  );
  const data = query.data;
  const now = useJudgingClock(data.serverNow);
  const [view, setView] = useState({
    mode: "hour" as "hour" | "agenda",
    roomId: "all",
    status: "all",
    search: "",
    offset: null as number | null,
  });
  const [acknowledgedCandidate, setAcknowledgedCandidate] = useState<
    string | null
  >(null);
  const [dropping, setDropping] = useState(false);
  const [selection, setSelection] = useState<AppointmentSelection | null>(null);
  const [inspecting, setInspecting] = useState<string | null>(null);
  const refresh = () =>
    utils.judging.listScheduleAdmin.invalidate({ hackathonId });
  const onError = (error: { message: string }) => toast.error(error.message);
  const generate = api.judging.generateSchedule.useMutation({
    onSuccess: async () => {
      setAcknowledgedCandidate(null);
      await refresh();
    },
    onError,
  });
  const save = api.judging.saveSchedule.useMutation({
    onSuccess: async () => {
      toast.success("Judging schedule saved.");
      await refresh();
    },
    onError,
  });
  const drop = api.judging.dropSchedule.useMutation({
    onSuccess: async () => {
      setDropping(false);
      toast.success("Schedule dropped. You can compare a new configuration.");
      await refresh();
    },
    onError,
  });
  const advance = api.judging.continueScheduleGeneration.useMutation({
    onSuccess: refresh,
    onError,
  });
  const continueGeneration = advance.mutate;
  const generationPending = advance.isPending;
  const job = data.job;
  const acknowledged = !!job && acknowledgedCandidate === job.candidateKey;
  useEffect(() => {
    if (data.schedule || job?.status !== "searching" || generationPending)
      return;
    const timer = window.setTimeout(
      () => continueGeneration({ hackathonId, jobId: job.id }),
      100,
    );
    return () => window.clearTimeout(timer);
  }, [
    continueGeneration,
    data.schedule,
    generationPending,
    hackathonId,
    job?.id,
    job?.nodes,
    job?.status,
  ]);

  const timing = data.schedule ?? job?.timing;
  const duration = timing
    ? timing.setupMinutes + timing.judgingMinutes + timing.teardownMinutes
    : 10;
  const appointments: BoardAppointment[] = data.schedule
    ? data.appointments
    : (job?.candidate ?? []).map((candidate, index) => {
        const task = data.source.tasks.find(
          (task) =>
            task.projectId === candidate.projectId &&
            task.challengeId === candidate.challengeId,
        );
        return {
          ...candidate,
          id: `preview-${index}`,
          endsAt: new Date(candidate.startsAt.getTime() + duration * 60_000),
          title: task?.title ?? "Project",
          challengeLabel: task?.challengeLabel ?? "Challenge",
          status: "future",
          canMove: false,
        };
      });
  const visibleAppointments = appointments.filter(
    (appointment) =>
      (view.status === "all" || appointment.status === view.status) &&
      `${appointment.title} ${appointment.challengeLabel}`
        .toLowerCase()
        .includes(view.search.trim().toLowerCase()),
  );
  const rooms = data.source.rooms.filter(
    (room) =>
      room.scheduled && (view.roomId === "all" || room.id === view.roomId),
  );
  const liveStart = timing
    ? Math.max(
        timing.startsAt.getTime(),
        Math.min(now.getTime(), timing.endsAt.getTime() - 60 * 60_000),
      )
    : now.getTime();
  const windowStart = new Date(
    view.offset ?? Math.floor(liveStart / 60_000) * 60_000,
  );
  const unassigned = data.schedule
    ? data.source.tasks.filter(
        (task) =>
          !data.appointments.some(
            (appointment) =>
              appointment.projectId === task.projectId &&
              appointment.challengeId === task.challengeId,
          ),
      )
    : [];
  const inspected = appointments.find(
    (appointment) => appointment.id === inspecting,
  );
  const latestEnd = appointments.length
    ? Math.max(
        ...appointments.map((appointment) => appointment.endsAt.getTime()),
      )
    : null;
  const overflow =
    timing && latestEnd
      ? Math.max(0, Math.floor((timing.endsAt.getTime() - latestEnd) / 60_000))
      : 0;
  const generationLabel =
    job?.status === "searching"
      ? "Improving preview"
      : job?.status === "optimal"
        ? "Best schedule proven"
        : job?.status === "feasible"
          ? "Feasible preview"
          : job?.status === "infeasible"
            ? "Window cannot fit this inventory"
            : job?.status === "incomplete"
              ? "Search ended without a complete schedule"
              : "Preview";

  return (
    <div className="flex flex-col gap-4">
      {query.error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 p-3 text-sm text-destructive"
        >
          Refresh failed: {query.error.message}. The schedule shown may be out
          of date.
        </p>
      ) : null}
      {!data.schedule ? (
        <ScheduleConfiguration
          key={hackathonId}
          pending={generate.isPending}
          timing={job?.timing}
          timeZone={timeZone}
          onGenerate={(timing) => generate.mutate({ hackathonId, timing })}
        />
      ) : null}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-white/10 bg-card/95 p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <Clock3 className="mt-1 size-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">
              {data.schedule ? "Judging schedule" : generationLabel}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {timing
                ? `${judgingTime(timing.startsAt, timeZone)} to ${judgingTime(timing.endsAt, timeZone)} · ${duration} minutes per appointment`
                : "Generate a preview to see room assignments."}
            </p>
            {timing ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {timing.setupMinutes} setup + {timing.judgingMinutes} judging +{" "}
                {timing.teardownMinutes} teardown · {overflow} minutes of
                trailing overflow
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.schedule ? (
            <>
              <Badge variant="outline">Refreshes every 5 seconds</Badge>
              <Button
                variant="outline"
                disabled={!!data.schedule.firstResultAt}
                onClick={() => setDropping(true)}
                title={
                  data.schedule.firstResultAt
                    ? "The first submitted scheduled result permanently locks Drop."
                    : undefined
                }
              >
                Drop schedule
              </Button>
            </>
          ) : job?.candidate.length ? (
            <Button
              disabled={
                generate.isPending ||
                save.isPending ||
                (!!job.reducedBreaks.length && !acknowledged)
              }
              onClick={() =>
                save.mutate({
                  hackathonId,
                  jobId: job.id,
                  candidateKey: job.candidateKey,
                  acknowledgeReducedBreaks: acknowledged,
                })
              }
            >
              {save.isPending ? "Saving..." : "Save this schedule"}
            </Button>
          ) : null}
        </div>
      </section>
      {!data.schedule && job ? (
        <div className="space-y-2 text-sm" role="status">
          {job.status === "searching" ? (
            <p className="flex items-center gap-2">
              <RefreshCw className="size-4 motion-safe:animate-spin" />
              Searching within the five-minute limit. A complete preview can be
              saved while the search continues.
            </p>
          ) : null}
          {job.status === "feasible" ? (
            <p>
              The candidate satisfies all constraints. The time limit ended
              before optimality could be proven.
            </p>
          ) : null}
          {job.status === "incomplete" ? (
            <p>
              No complete candidate was found within the limit. This does not
              prove the window is impossible, so travel breaks have not been
              silently relaxed.
            </p>
          ) : null}
          {job.diagnostics.map((message) => (
            <p
              className="rounded-md border border-amber-400/40 bg-amber-400/10 p-3"
              key={message}
            >
              {data.source.tasks.reduce(
                (copy, task) =>
                  copy
                    .replaceAll(task.challengeId, task.challengeLabel)
                    .replaceAll(task.projectId, task.title),
                message,
              )}
            </p>
          ))}
          {job.status === "infeasible" && !job.diagnostics.length ? (
            <p className="text-amber-200">
              Neither the full travel break nor the baseline break can fit every
              presentation. Adjust the window, timing, or staffed rooms.
            </p>
          ) : null}
        </div>
      ) : null}
      {!data.schedule && job?.reducedBreaks.length ? (
        <div className="space-y-3 rounded-md border border-amber-400/40 bg-amber-400/10 p-4">
          <h3 className="font-semibold">Reduced cross-building breaks</h3>
          <p className="text-sm">
            The full travel break was proven infeasible. These teams use the
            baseline break:
          </p>
          <ul className="max-h-48 overflow-y-auto text-sm">
            {job.reducedBreaks.map((gap) => (
              <li key={`${gap.projectId}:${gap.afterTaskIndex}`}>
                {
                  data.source.tasks.find(
                    (task) => task.projectId === gap.projectId,
                  )?.title
                }{" "}
                · {gap.breakMinutes} minutes
              </li>
            ))}
          </ul>
          <Label className="flex min-h-11 items-center gap-3">
            <Checkbox
              checked={acknowledged}
              onCheckedChange={(value) =>
                setAcknowledgedCandidate(
                  value === true ? job.candidateKey : null,
                )
              }
            />
            I acknowledge these reduced travel breaks.
          </Label>
        </div>
      ) : null}
      {unassigned.length ? (
        <div className="space-y-3 rounded-md border border-amber-400/40 bg-card/95 p-4">
          <h3 className="font-semibold">
            {unassigned.length} presentations need an appointment
          </h3>
          <div className="max-h-60 overflow-y-auto">
            {unassigned.map((task) => (
              <div
                key={`${task.projectId}:${task.challengeId}`}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 py-2 text-sm"
              >
                <span>
                  {task.title} · {task.challengeLabel}
                </span>
                <Button
                  variant="outline"
                  onClick={() =>
                    setSelection({
                      projectId: task.projectId,
                      challengeId: task.challengeId,
                    })
                  }
                >
                  Assign
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-44 flex-1 space-y-1">
          <Label htmlFor="schedule-search">Find a project or challenge</Label>
          <Input
            id="schedule-search"
            value={view.search}
            onChange={(event) =>
              setView({ ...view, search: event.target.value })
            }
            className="min-h-11"
            placeholder="Search schedule"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="schedule-room">Room</Label>
          <select
            id="schedule-room"
            className="h-11 max-w-full rounded-md border border-input bg-background px-3 text-sm"
            value={view.roomId}
            onChange={(event) =>
              setView({ ...view, roomId: event.target.value })
            }
          >
            <option value="all">All scheduled rooms</option>
            {data.source.rooms
              .filter((room) => room.scheduled)
              .map((room) => (
                <option key={room.id} value={room.id}>
                  {room.buildingName} {room.name}
                </option>
              ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="schedule-status">Status</Label>
          <select
            id="schedule-status"
            className="h-11 rounded-md border border-input bg-background px-3 text-sm"
            value={view.status}
            onChange={(event) =>
              setView({ ...view, status: event.target.value })
            }
          >
            <option value="all">All statuses</option>
            {Object.entries(appointmentStatusLabels).map(([status, label]) => (
              <option key={status} value={status}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <Button
          className="min-h-11"
          variant="outline"
          onClick={() =>
            setView({ ...view, mode: view.mode === "hour" ? "agenda" : "hour" })
          }
        >
          {view.mode === "hour" ? "Full room agendas" : "60-minute timeline"}
        </Button>
        {view.mode === "hour" ? (
          <div className="flex gap-1">
            <Button
              className="min-h-11"
              variant="outline"
              aria-label="Previous hour"
              onClick={() =>
                setView({
                  ...view,
                  offset: windowStart.getTime() - 60 * 60_000,
                })
              }
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              className="min-h-11"
              variant="outline"
              onClick={() => setView({ ...view, offset: null })}
            >
              Now
            </Button>
            <Button
              className="min-h-11"
              variant="outline"
              aria-label="Next hour"
              onClick={() =>
                setView({
                  ...view,
                  offset: windowStart.getTime() + 60 * 60_000,
                })
              }
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>
      <ScheduleBoard
        appointments={visibleAppointments}
        rooms={rooms}
        timeZone={timeZone}
        windowStart={windowStart}
        mode={view.mode}
        now={now}
        onSelect={setInspecting}
      />
      <p className="text-sm text-muted-foreground">
        MLH rooms are unscheduled. Room warnings do not move or cancel bookings.
        Schedules are internal to judging; hacker distribution comes later.
      </p>
      {selection ? (
        <AppointmentMoveDialog
          key={
            "appointmentId" in selection
              ? selection.appointmentId
              : `${selection.projectId}:${selection.challengeId}`
          }
          selection={selection}
          hackathonId={hackathonId}
          timeZone={timeZone}
          onClose={() => setSelection(null)}
        />
      ) : null}
      <Dialog
        open={!!inspected}
        onOpenChange={(open) => {
          if (!open) setInspecting(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{inspected?.title}</DialogTitle>
            <DialogDescription>{inspected?.challengeLabel}</DialogDescription>
          </DialogHeader>
          {inspected ? (
            <div className="space-y-2 text-sm">
              <p>
                {judgingTime(inspected.startsAt, timeZone)} to{" "}
                {judgingTime(inspected.endsAt, timeZone)}
              </p>
              <p>
                {
                  data.source.rooms.find((room) => room.id === inspected.roomId)
                    ?.buildingName
                }{" "}
                {
                  data.source.rooms.find((room) => room.id === inspected.roomId)
                    ?.name
                }
              </p>
              <Badge variant="outline">
                {appointmentStatusLabels[inspected.status]}
              </Badge>
              {inspected.canMove ? (
                <Button
                  className="mt-4 w-full"
                  onClick={() => {
                    setSelection({ appointmentId: inspected.id });
                    setInspecting(null);
                  }}
                >
                  Reassign appointment
                </Button>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={dropping} onOpenChange={setDropping}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Drop this schedule?</DialogTitle>
            <DialogDescription>
              This clears its reservations and unsent drafts so you can compare
              another configuration. Submitted evaluations are kept. Drop is
              unavailable after the first scheduled result.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDropping(false)}>
              Keep schedule
            </Button>
            <Button
              variant="destructive"
              disabled={drop.isPending}
              onClick={() => drop.mutate({ hackathonId })}
            >
              {drop.isPending ? "Dropping..." : "Drop schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
