import { TRPCError } from "@trpc/server";

import type { AlertPreferenceInput } from "@forge/validators";
import { JOB_BOARD } from "@forge/consts";
import { and, eq } from "@forge/db";
import { JobAlertPreference } from "@forge/db/schemas/job-board";
import { normalizeCompanyName } from "@forge/validators";

import type { WriteDb } from "../db";
import { hasUsCity } from "../career/us-cities";
import { isUniqueViolation } from "../db";

const preferenceColumns = {
  id: JobAlertPreference.id,
  track: JobAlertPreference.track,
  kind: JobAlertPreference.kind,
  targetKey: JobAlertPreference.targetKey,
  customValue: JobAlertPreference.customValue,
  createdAt: JobAlertPreference.createdAt,
};

function preferenceValues({ track, kind, target }: AlertPreferenceInput) {
  if (target.kind === "other") {
    const targetKey = normalizeCompanyName(target.text);
    if (
      targetKey.length === 0 ||
      targetKey.length > JOB_BOARD.MAX_ALERT_CUSTOM_VALUE_LENGTH
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Enter a valid custom alert target within the length limit.",
      });
    }
    return { track, kind, targetKey, customValue: target.text };
  }

  if (target.kind === "remote_us") {
    return { track, kind, targetKey: target.kind, customValue: null };
  }

  if (kind === "location" && !hasUsCity(target.value)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Select a known U.S. city.",
    });
  }
  return { track, kind, targetKey: target.value, customValue: null };
}

function handlePreferenceWriteError(error: unknown): never {
  if (isUniqueViolation(error)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "You already have this alert preference for this track.",
    });
  }
  throw error;
}

function ownedPreference(memberId: string, preferenceId: string) {
  return and(
    eq(JobAlertPreference.memberId, memberId),
    eq(JobAlertPreference.id, preferenceId),
  );
}

export function listAlertPreferences(db: WriteDb, memberId: string) {
  return db
    .select(preferenceColumns)
    .from(JobAlertPreference)
    .where(eq(JobAlertPreference.memberId, memberId))
    .orderBy(JobAlertPreference.createdAt, JobAlertPreference.id);
}

export async function addAlertPreference(
  db: WriteDb,
  memberId: string,
  input: AlertPreferenceInput,
) {
  const [preference] = await db
    .insert(JobAlertPreference)
    .values({ memberId, ...preferenceValues(input) })
    .returning(preferenceColumns)
    .catch(handlePreferenceWriteError);

  if (!preference) throw new Error("Alert preference was not created.");
  return preference;
}

export async function updateAlertPreference(
  db: WriteDb,
  memberId: string,
  preferenceId: string,
  input: AlertPreferenceInput,
) {
  const [preference] = await db
    .update(JobAlertPreference)
    .set(preferenceValues(input))
    .where(ownedPreference(memberId, preferenceId))
    .returning(preferenceColumns)
    .catch(handlePreferenceWriteError);

  if (!preference) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Alert preference not found.",
    });
  }
  return preference;
}

export async function removeAlertPreference(
  db: WriteDb,
  memberId: string,
  preferenceId: string,
) {
  const [preference] = await db
    .delete(JobAlertPreference)
    .where(ownedPreference(memberId, preferenceId))
    .returning({ id: JobAlertPreference.id });

  if (!preference) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Alert preference not found.",
    });
  }
  return preference;
}
