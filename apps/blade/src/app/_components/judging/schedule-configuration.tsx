"use client";

import type { FormEvent } from "react";
import { DateTime } from "luxon";

import type { RouterInputs } from "@forge/api";
import { Button } from "@forge/ui/button";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { toast } from "@forge/ui/toast";
import { judgingScheduleTimingSchema } from "@forge/validators";

import { judgingDateInput } from "~/lib/judging/schedule-display";

type Timing = RouterInputs["judging"]["generateSchedule"]["timing"];

export function ScheduleConfiguration({
  pending,
  onGenerate,
  timeZone,
  timing,
}: {
  pending: boolean;
  onGenerate: (timing: Timing) => void;
  timeZone: string;
  timing?: Timing;
}) {
  const startsAt =
    timing?.startsAt ??
    DateTime.now().plus({ minutes: 30 }).startOf("minute").toJSDate();
  const endsAt =
    timing?.endsAt ?? new Date(startsAt.getTime() + 4 * 60 * 60_000);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form);
    const parsed = judgingScheduleTimingSchema.safeParse({
      startsAt: DateTime.fromISO(
        typeof values.startsAt === "string" ? values.startsAt : "",
        {
          zone: timeZone,
        },
      ).toJSDate(),
      endsAt: DateTime.fromISO(
        typeof values.endsAt === "string" ? values.endsAt : "",
        {
          zone: timeZone,
        },
      ).toJSDate(),
      setupMinutes: Number(values.setupMinutes),
      judgingMinutes: Number(values.judgingMinutes),
      teardownMinutes: Number(values.teardownMinutes),
      sameBuildingBreakMinutes: Number(values.sameBuildingBreakMinutes),
      differentBuildingBreakMinutes: Number(
        values.differentBuildingBreakMinutes,
      ),
    });
    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ?? "Check the judging window.",
      );
      return;
    }
    onGenerate(parsed.data);
  }
  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-5 rounded-lg border border-white/10 bg-card/95 p-4 shadow-xl sm:p-5"
    >
      <div>
        <h2 className="text-lg font-semibold">Judging window</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set the window in {timeZone}. Every appointment includes setup,
          judging, and teardown.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="schedule-start">Start</Label>
          <Input
            id="schedule-start"
            name="startsAt"
            type="datetime-local"
            step={60}
            required
            className="min-h-11"
            defaultValue={judgingDateInput(startsAt, timeZone)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="schedule-end">End</Label>
          <Input
            id="schedule-end"
            name="endsAt"
            type="datetime-local"
            step={60}
            required
            className="min-h-11"
            defaultValue={judgingDateInput(endsAt, timeZone)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {(
          [
            ["setupMinutes", "Setup", 2, 0],
            ["judgingMinutes", "Judging", 6, 1],
            ["teardownMinutes", "Teardown", 2, 0],
            ["sameBuildingBreakMinutes", "Same-building break", 10, 1],
            ["differentBuildingBreakMinutes", "Cross-building break", 20, 1],
          ] as const
        ).map(([name, label, fallback, min]) => (
          <div className="space-y-2" key={name}>
            <Label htmlFor={`schedule-${name}`}>{label}</Label>
            <Input
              id={`schedule-${name}`}
              name={name}
              type="number"
              min={min}
              step={1}
              defaultValue={timing?.[name] ?? fallback}
              required
              className="min-h-11"
            />
            <span className="text-sm text-muted-foreground">Minutes</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Sponsors finish first, then all judging finishes as early as possible.
          Building trips and team breaks improve within those priorities.
        </p>
        <Button type="submit" disabled={pending} className="min-h-11">
          {pending ? "Starting generation..." : "Generate preview"}
        </Button>
      </div>
    </form>
  );
}
