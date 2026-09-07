import { createHash } from "node:crypto";
import { z } from "zod";

import { judgingScheduleTimingSchema } from "@forge/validators";

import type { ScheduleProblem } from "./model";
import type { ScheduleSearch } from "./solver";

export const scheduleProblemSchema: z.ZodType<ScheduleProblem> = z.object({
  durationMinutes: z.number().int().positive(),
  windowMinutes: z.number().int().positive(),
  sameBuildingBreakMinutes: z.number().int().positive(),
  differentBuildingBreakMinutes: z.number().int().positive(),
  rooms: z.array(
    z.object({
      id: z.string(),
      challengeId: z.string(),
      buildingId: z.string(),
    }),
  ),
  tasks: z.array(
    z.object({
      projectId: z.string(),
      challengeId: z.string(),
      sponsor: z.boolean(),
    }),
  ),
});

const placement = z.object({
  taskIndex: z.number().int().nonnegative(),
  roomIndex: z.number().int().nonnegative(),
  slot: z.number().int().nonnegative(),
});

export const scheduleSearchSchema: z.ZodType<ScheduleSearch> = z.object({
  assignments: z.array(placement),
  stack: z.array(
    z.object({
      taskIndex: z.number().int().nonnegative(),
      candidates: z.array(z.number().int().nonnegative()),
      next: z.number().int().nonnegative(),
    }),
  ),
  incumbent: z.array(placement).nullable(),
  score: z
    .tuple([z.number(), z.number(), z.number(), z.number(), z.number()])
    .nullable(),
  nodes: z.number().int().nonnegative(),
  exhausted: z.boolean(),
  relaxed: z.boolean(),
  diagnostics: z.array(z.string()),
});

export function readStoredTiming(value: unknown) {
  const raw = z.record(z.string(), z.unknown()).parse(value);
  return judgingScheduleTimingSchema.parse({
    ...raw,
    startsAt: new Date(z.string().parse(raw.startsAt)),
    endsAt: new Date(z.string().parse(raw.endsAt)),
  });
}

/** Bind organizer review to the exact candidate, not ongoing search progress. */
export function scheduleCandidateKey(
  search: Pick<ScheduleSearch, "relaxed" | "incumbent">,
) {
  return createHash("sha256")
    .update(JSON.stringify([search.relaxed, search.incumbent]))
    .digest("hex");
}
