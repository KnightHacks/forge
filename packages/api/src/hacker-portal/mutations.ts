import { createHash } from "node:crypto";

import type {
  CheckInPassDto,
  ConfirmAttendanceInput,
  SubmitApplicationInput,
  UpdateHackerApplicationInput,
  UpdateHackerParticipantInput,
  UpdateHackerProfileInput,
  WithdrawApplicationInput,
} from "@forge/hacker-sdk/contracts";
import { and, count, eq, inArray, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { User } from "@forge/db/schemas/auth";
import {
  Hackathon,
  Hacker,
  HackerAttendee,
  HackerCheckInPass,
  HackerProfile,
} from "@forge/db/schemas/knight-hacks";

import type { HackerPortalContext } from "./trpc";
import { createAdminAuditEvent } from "../utils/audit/service";
import { deriveOpaqueHackerCheckInPass } from "../utils/hacker-portal/check-in-pass";
import { getParticipantCapabilities } from "../utils/hacker-portal/policy";
import {
  prepareStatusMail,
  writeStatusMail,
} from "../utils/hacker/status-mail";
import { validateAndWriteAgreements } from "./agreements";
import { runParticipantCommand } from "./commands";
import {
  applicationDto,
  loadParticipantApplication,
  profileDto,
  revokeActivePasses,
} from "./data";
import {
  createOrReviseProfile,
  deriveDiscordProfileIdentity,
  legacyHackerValues,
} from "./profile";
import { portalFailure } from "./trpc";

type AuthenticatedPortalContext = HackerPortalContext & {
  client: NonNullable<HackerPortalContext["client"]>;
  session: NonNullable<HackerPortalContext["session"]>;
};

async function lockedHackathon(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  hackathonId: string,
) {
  const [row] = await tx
    .select({
      applicationDeadline: Hackathon.applicationDeadline,
      applicationOpen: Hackathon.applicationOpen,
      applicationUrl: Hackathon.applicationUrl,
      confirmationCapacity: Hackathon.confirmationCapacity,
      confirmationDeadline: Hackathon.confirmationDeadline,
      databaseNow: sql<Date>`now()`,
      displayName: Hackathon.displayName,
      endDate: Hackathon.endDate,
      id: Hackathon.id,
      name: Hackathon.name,
      startDate: Hackathon.startDate,
    })
    .from(Hackathon)
    .where(eq(Hackathon.id, hackathonId))
    // Participant command rows take a KEY SHARE lock through their hackathon
    // FK before lifecycle work begins. NO KEY UPDATE still serializes capacity
    // and window decisions without deadlocking two concurrent commands.
    .for("no key update")
    .limit(1);
  if (!row)
    portalFailure("FORBIDDEN", "This hacker portal is not available.", {
      trpcCode: "FORBIDDEN",
    });
  return row;
}

function statusMailHackathon(
  hackathon: Awaited<ReturnType<typeof lockedHackathon>>,
) {
  return {
    applicationUrl: hackathon.applicationUrl,
    confirmationDeadline: hackathon.confirmationDeadline,
    displayName: hackathon.displayName,
    endDate: hackathon.endDate,
    id: hackathon.id,
    name: hackathon.name,
    startDate: hackathon.startDate,
  };
}

async function mutationResult(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  ctx: AuthenticatedPortalContext,
) {
  const [profile] = await tx
    .select()
    .from(HackerProfile)
    .where(eq(HackerProfile.userId, ctx.session.userId))
    .limit(1);
  const application = await loadParticipantApplication(
    ctx.session.userId,
    ctx.session.hackathonId,
    tx,
  );
  return {
    application: application ? applicationDto(application) : null,
    profile: profile ? profileDto(profile) : null,
    requestId: ctx.requestId,
  };
}

function participantActor(
  userId: string,
  firstName?: string,
  lastName?: string,
) {
  const name = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return { id: userId, ...(name ? { name } : {}) };
}

export async function submitApplication(
  ctx: AuthenticatedPortalContext,
  input: SubmitApplicationInput,
) {
  const preflight = await db
    .select({ hackathon: Hackathon })
    .from(Hackathon)
    .where(eq(Hackathon.id, ctx.session.hackathonId))
    .limit(1);
  const configured = preflight[0]?.hackathon;
  if (!configured)
    portalFailure("FORBIDDEN", "This hacker portal is not available.", {
      trpcCode: "FORBIDDEN",
    });
  const preparedMail = await prepareStatusMail({
    hackathon: statusMailHackathon({ ...configured, databaseNow: new Date() }),
    status: "pending",
  });

  return db.transaction(async (tx) =>
    runParticipantCommand({
      hackathonId: ctx.session.hackathonId,
      idempotencyKey: input.idempotencyKey,
      input,
      operation: "submit_application",
      tx,
      userId: ctx.session.userId,
      work: async () => {
        const hackathon = await lockedHackathon(tx, ctx.session.hackathonId);
        const now = new Date(hackathon.databaseNow);
        if (
          now < hackathon.applicationOpen ||
          now > hackathon.applicationDeadline ||
          now >= hackathon.startDate
        ) {
          portalFailure("APPLICATION_CLOSED", "Applications are not open.", {
            trpcCode: "PRECONDITION_FAILED",
          });
        }
        const existing = await loadParticipantApplication(
          ctx.session.userId,
          ctx.session.hackathonId,
          tx,
        );
        if (existing) {
          portalFailure(
            "DUPLICATE_APPLICATION",
            "An application already exists for this hackathon.",
            {
              trpcCode: "CONFLICT",
            },
          );
        }
        const [authUser] = await tx
          .select({
            discordUserId: User.discordUserId,
            name: User.name,
          })
          .from(User)
          .where(eq(User.id, ctx.session.userId))
          .limit(1);
        if (!authUser) {
          portalFailure(
            "UNAUTHENTICATED",
            "The signed-in account no longer exists.",
            {
              trpcCode: "UNAUTHORIZED",
            },
          );
        }
        const profileFields = {
          ...input.profile,
          discordUser: deriveDiscordProfileIdentity(authUser),
        };
        const profileState = await createOrReviseProfile({
          fields: profileFields,
          now,
          tx,
          userId: ctx.session.userId,
        });
        const [legacy] = await tx
          .insert(Hacker)
          .values(
            legacyHackerValues(
              profileFields,
              {
                firstTime: input.firstTime,
                survey1: input.survey1,
                survey2: input.survey2,
                userId: ctx.session.userId,
              },
              hackathon.startDate,
            ),
          )
          .returning({ id: Hacker.id });
        if (!legacy)
          throw new Error("Failed to create compatibility hacker snapshot.");
        const [attendee] = await tx
          .insert(HackerAttendee)
          .values({
            hackerId: legacy.id,
            hackathonId: hackathon.id,
            isFirstTime: input.firstTime,
            profileId: profileState.profile.id,
            profileRevisionId: profileState.revision.id,
            status: "pending",
            survey1: input.survey1,
            survey2: input.survey2,
            timeApplied: now,
          })
          .returning({ id: HackerAttendee.id });
        if (!attendee) throw new Error("Failed to create hacker application.");
        await validateAndWriteAgreements({
          acceptances: input.agreements,
          attendeeId: attendee.id,
          hackathonId: hackathon.id,
          now,
          stage: "application",
          tx,
        });
        const sendId = await writeStatusMail(
          tx,
          preparedMail,
          ctx.session.userId,
          [
            {
              attendeeId: attendee.id,
              email: input.profile.email,
              firstName: input.profile.firstName,
              name: `${input.profile.firstName} ${input.profile.lastName}`,
              status: "pending",
              userId: ctx.session.userId,
            },
          ],
        );
        if (sendId) {
          await tx
            .update(HackerAttendee)
            .set({ lastStatusSendId: sendId })
            .where(eq(HackerAttendee.id, attendee.id));
        }
        await createAdminAuditEvent(
          {
            actionKey: "hacker.application_submitted",
            actor: participantActor(
              ctx.session.userId,
              input.profile.firstName,
              input.profile.lastName,
            ),
            metadata: {
              revision: profileState.profile.revision,
              status: "pending",
            },
            subjects: [
              {
                relation: "primary",
                targetId: attendee.id,
                targetLabel: `${input.profile.firstName} ${input.profile.lastName}`,
                targetType: "hacker_attendee",
              },
              {
                relation: "secondary",
                targetId: hackathon.id,
                targetLabel: hackathon.displayName,
                targetType: "hackathon",
              },
            ],
          },
          tx,
        );
        return mutationResult(tx, ctx);
      },
    }),
  );
}

async function requireEditableApplication(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  ctx: AuthenticatedPortalContext,
) {
  const hackathon = await lockedHackathon(tx, ctx.session.hackathonId);
  const application = await loadParticipantApplication(
    ctx.session.userId,
    ctx.session.hackathonId,
    tx,
  );
  const now = new Date(hackathon.databaseNow);
  if (
    !application ||
    !getParticipantCapabilities({
      confirmationDeadline: hackathon.confirmationDeadline,
      now,
      start: hackathon.startDate,
      status: application.status,
    }).canEdit
  ) {
    portalFailure(
      "APPLICATION_LOCKED",
      "This application can no longer be edited.",
      {
        trpcCode: "PRECONDITION_FAILED",
      },
    );
  }
  return { application, hackathon, now };
}

export async function updateProfile(
  ctx: AuthenticatedPortalContext,
  input: UpdateHackerProfileInput,
) {
  return db.transaction(async (tx) =>
    runParticipantCommand({
      hackathonId: ctx.session.hackathonId,
      idempotencyKey: input.idempotencyKey,
      input,
      operation: "update_profile",
      tx,
      userId: ctx.session.userId,
      work: async () => {
        const { application, hackathon, now } =
          await requireEditableApplication(tx, ctx);
        const [current] = await tx
          .select()
          .from(HackerProfile)
          .where(eq(HackerProfile.userId, ctx.session.userId))
          .limit(1);
        if (!current) throw new Error("Hacker profile is missing.");
        const {
          id: _id,
          createdAt: _createdAt,
          resumeUrl: _resumeUrl,
          revision: _revision,
          updatedAt: _updatedAt,
          userId: _userId,
          ...currentFields
        } = current;
        const profileState = await createOrReviseProfile({
          expectedRevision: input.expectedRevision,
          fields: { ...currentFields, ...input.profile },
          now,
          tx,
          userId: ctx.session.userId,
        });
        await createAdminAuditEvent(
          {
            actionKey: "hacker.profile_updated",
            actor: participantActor(
              ctx.session.userId,
              profileState.profile.firstName,
              profileState.profile.lastName,
            ),
            metadata: { revision: profileState.profile.revision },
            subjects: [
              {
                relation: "primary",
                targetId: profileState.profile.id,
                targetLabel: `${profileState.profile.firstName} ${profileState.profile.lastName}`,
                targetType: "hacker_profile",
              },
              {
                relation: "secondary",
                targetId: application.attendeeId,
                targetLabel: hackathon.displayName,
                targetType: "hacker_attendee",
              },
            ],
          },
          tx,
        );
        return mutationResult(tx, ctx);
      },
    }),
  );
}

export async function updateApplication(
  ctx: AuthenticatedPortalContext,
  input: UpdateHackerApplicationInput,
) {
  return db.transaction(async (tx) =>
    runParticipantCommand({
      hackathonId: ctx.session.hackathonId,
      idempotencyKey: input.idempotencyKey,
      input,
      operation: "update_application",
      tx,
      userId: ctx.session.userId,
      work: async () => {
        const { application, hackathon, now } =
          await requireEditableApplication(tx, ctx);
        if (input.agreements) {
          await validateAndWriteAgreements({
            acceptances: input.agreements,
            attendeeId: application.attendeeId,
            hackathonId: hackathon.id,
            now,
            stage: "application",
            tx,
          });
        }
        await tx
          .update(HackerAttendee)
          .set({
            ...(input.firstTime !== undefined
              ? { isFirstTime: input.firstTime }
              : {}),
            ...(input.survey1 !== undefined ? { survey1: input.survey1 } : {}),
            ...(input.survey2 !== undefined ? { survey2: input.survey2 } : {}),
          })
          .where(eq(HackerAttendee.id, application.attendeeId));
        await tx
          .update(Hacker)
          .set({
            ...(input.firstTime !== undefined
              ? { isFirstTime: input.firstTime }
              : {}),
            ...(input.survey1 !== undefined ? { survey1: input.survey1 } : {}),
            ...(input.survey2 !== undefined ? { survey2: input.survey2 } : {}),
          })
          .where(eq(Hacker.id, application.hackerId));
        await createAdminAuditEvent(
          {
            actionKey: "hacker.application_updated",
            actor: participantActor(ctx.session.userId),
            metadata: { revision: application.profileRevision },
            subjects: [
              {
                relation: "primary",
                targetId: application.attendeeId,
                targetLabel: hackathon.displayName,
                targetType: "hacker_attendee",
              },
            ],
          },
          tx,
        );
        return mutationResult(tx, ctx);
      },
    }),
  );
}

export async function updateParticipant(
  ctx: AuthenticatedPortalContext,
  input: UpdateHackerParticipantInput,
) {
  return db.transaction(async (tx) =>
    runParticipantCommand({
      hackathonId: ctx.session.hackathonId,
      idempotencyKey: input.idempotencyKey,
      input,
      operation: "update_participant",
      tx,
      userId: ctx.session.userId,
      work: async () => {
        const { application, hackathon, now } =
          await requireEditableApplication(tx, ctx);
        const [current] = await tx
          .select()
          .from(HackerProfile)
          .where(eq(HackerProfile.userId, ctx.session.userId))
          .limit(1);
        if (!current) throw new Error("Hacker profile is missing.");

        if (input.agreements) {
          await validateAndWriteAgreements({
            acceptances: input.agreements,
            attendeeId: application.attendeeId,
            hackathonId: hackathon.id,
            now,
            stage: "application",
            tx,
          });
        }

        const applicationFields = {
          ...(input.firstTime !== undefined
            ? { isFirstTime: input.firstTime }
            : {}),
          ...(input.survey1 !== undefined ? { survey1: input.survey1 } : {}),
          ...(input.survey2 !== undefined ? { survey2: input.survey2 } : {}),
        };
        const updatesApplication = Object.keys(applicationFields).length > 0;
        if (updatesApplication) {
          await tx
            .update(HackerAttendee)
            .set(applicationFields)
            .where(eq(HackerAttendee.id, application.attendeeId));
          await tx
            .update(Hacker)
            .set(applicationFields)
            .where(eq(Hacker.id, application.hackerId));
        }

        const updatesProfile = Object.keys(input.profile).length > 0;
        let profile = current;
        if (updatesProfile) {
          const {
            id: _id,
            createdAt: _createdAt,
            resumeUrl: _resumeUrl,
            revision: _revision,
            updatedAt: _updatedAt,
            userId: _userId,
            ...currentFields
          } = current;
          const profileState = await createOrReviseProfile({
            expectedRevision: input.expectedRevision,
            fields: { ...currentFields, ...input.profile },
            now,
            tx,
            userId: ctx.session.userId,
          });
          profile = profileState.profile;
        }

        const actor = participantActor(
          ctx.session.userId,
          profile.firstName,
          profile.lastName,
        );
        if (updatesApplication || input.agreements) {
          await createAdminAuditEvent(
            {
              actionKey: "hacker.application_updated",
              actor,
              metadata: { revision: profile.revision },
              subjects: [
                {
                  relation: "primary",
                  targetId: application.attendeeId,
                  targetLabel: hackathon.displayName,
                  targetType: "hacker_attendee",
                },
              ],
            },
            tx,
          );
        }
        if (updatesProfile) {
          await createAdminAuditEvent(
            {
              actionKey: "hacker.profile_updated",
              actor,
              metadata: { revision: profile.revision },
              subjects: [
                {
                  relation: "primary",
                  targetId: profile.id,
                  targetLabel: `${profile.firstName} ${profile.lastName}`,
                  targetType: "hacker_profile",
                },
                {
                  relation: "secondary",
                  targetId: application.attendeeId,
                  targetLabel: hackathon.displayName,
                  targetType: "hacker_attendee",
                },
              ],
            },
            tx,
          );
        }
        return mutationResult(tx, ctx);
      },
    }),
  );
}

export async function confirmAttendance(
  ctx: AuthenticatedPortalContext,
  input: ConfirmAttendanceInput,
) {
  const [configured] = await db
    .select()
    .from(Hackathon)
    .where(eq(Hackathon.id, ctx.session.hackathonId))
    .limit(1);
  if (!configured)
    portalFailure("FORBIDDEN", "This hacker portal is not available.", {
      trpcCode: "FORBIDDEN",
    });
  const preparedMail = await prepareStatusMail({
    hackathon: statusMailHackathon({ ...configured, databaseNow: new Date() }),
    status: "confirmed",
  });
  return db.transaction(async (tx) =>
    runParticipantCommand({
      hackathonId: ctx.session.hackathonId,
      idempotencyKey: input.idempotencyKey,
      input,
      operation: "confirm_attendance",
      tx,
      userId: ctx.session.userId,
      work: async () => {
        const hackathon = await lockedHackathon(tx, ctx.session.hackathonId);
        const application = await loadParticipantApplication(
          ctx.session.userId,
          ctx.session.hackathonId,
          tx,
        );
        const now = new Date(hackathon.databaseNow);
        if (application?.status !== "accepted") {
          portalFailure(
            "FORBIDDEN_STATUS",
            "Only accepted hackers can confirm.",
            { trpcCode: "PRECONDITION_FAILED" },
          );
        }
        if (
          now > hackathon.confirmationDeadline ||
          now >= hackathon.startDate
        ) {
          portalFailure(
            "CONFIRMATION_CLOSED",
            "The confirmation window is closed.",
            { trpcCode: "PRECONDITION_FAILED" },
          );
        }
        if (hackathon.confirmationCapacity !== null) {
          const [capacity] = await tx
            .select({ value: count(HackerAttendee.id) })
            .from(HackerAttendee)
            .where(
              and(
                eq(HackerAttendee.hackathonId, hackathon.id),
                inArray(HackerAttendee.status, ["confirmed", "checkedin"]),
              ),
            );
          if ((capacity?.value ?? 0) >= hackathon.confirmationCapacity) {
            portalFailure(
              "CAPACITY_REACHED",
              "This hackathon has reached confirmation capacity.",
              { trpcCode: "PRECONDITION_FAILED" },
            );
          }
        }
        await validateAndWriteAgreements({
          acceptances: input.agreements,
          attendeeId: application.attendeeId,
          hackathonId: hackathon.id,
          now,
          stage: "confirmation",
          tx,
        });
        const [profile] = await tx
          .select()
          .from(HackerProfile)
          .where(eq(HackerProfile.userId, ctx.session.userId))
          .limit(1);
        if (!profile) throw new Error("Hacker profile is missing.");
        const sendId = await writeStatusMail(
          tx,
          preparedMail,
          ctx.session.userId,
          [
            {
              attendeeId: application.attendeeId,
              email: profile.email,
              firstName: profile.firstName,
              name: `${profile.firstName} ${profile.lastName}`,
              status: "confirmed",
              userId: ctx.session.userId,
            },
          ],
        );
        await tx
          .update(HackerAttendee)
          .set({
            lastStatusSendId: sendId,
            status: "confirmed",
            timeConfirmed: now,
          })
          .where(
            and(
              eq(HackerAttendee.id, application.attendeeId),
              eq(HackerAttendee.status, "accepted"),
            ),
          );
        await createAdminAuditEvent(
          {
            actionKey: "hacker.application_confirmed",
            actor: participantActor(
              ctx.session.userId,
              profile.firstName,
              profile.lastName,
            ),
            metadata: { status: "confirmed" },
            subjects: [
              {
                relation: "primary",
                targetId: application.attendeeId,
                targetLabel: `${profile.firstName} ${profile.lastName}`,
                targetType: "hacker_attendee",
              },
            ],
          },
          tx,
        );
        return mutationResult(tx, ctx);
      },
    }),
  );
}

export async function withdrawApplication(
  ctx: AuthenticatedPortalContext,
  input: WithdrawApplicationInput,
) {
  const [configured] = await db
    .select()
    .from(Hackathon)
    .where(eq(Hackathon.id, ctx.session.hackathonId))
    .limit(1);
  if (!configured)
    portalFailure("FORBIDDEN", "This hacker portal is not available.", {
      trpcCode: "FORBIDDEN",
    });
  const preparedMail = await prepareStatusMail({
    hackathon: statusMailHackathon({ ...configured, databaseNow: new Date() }),
    status: "withdrawn",
  });
  return db.transaction(async (tx) =>
    runParticipantCommand({
      hackathonId: ctx.session.hackathonId,
      idempotencyKey: input.idempotencyKey,
      input,
      operation: "withdraw_application",
      tx,
      userId: ctx.session.userId,
      work: async () => {
        const hackathon = await lockedHackathon(tx, ctx.session.hackathonId);
        const application = await loadParticipantApplication(
          ctx.session.userId,
          ctx.session.hackathonId,
          tx,
        );
        const now = new Date(hackathon.databaseNow);
        if (
          !application ||
          !getParticipantCapabilities({
            confirmationDeadline: hackathon.confirmationDeadline,
            now,
            start: hackathon.startDate,
            status: application.status,
          }).canWithdraw
        ) {
          portalFailure(
            "FORBIDDEN_STATUS",
            "This application cannot be withdrawn.",
            { trpcCode: "PRECONDITION_FAILED" },
          );
        }
        const [profile] = await tx
          .select()
          .from(HackerProfile)
          .where(eq(HackerProfile.userId, ctx.session.userId))
          .limit(1);
        if (!profile) throw new Error("Hacker profile is missing.");
        const sendId = await writeStatusMail(
          tx,
          preparedMail,
          ctx.session.userId,
          [
            {
              attendeeId: application.attendeeId,
              email: profile.email,
              firstName: profile.firstName,
              name: `${profile.firstName} ${profile.lastName}`,
              status: "withdrawn",
              userId: ctx.session.userId,
            },
          ],
        );
        await tx
          .update(HackerAttendee)
          .set({ lastStatusSendId: sendId, status: "withdrawn" })
          .where(eq(HackerAttendee.id, application.attendeeId));
        await revokeActivePasses(tx, application.attendeeId, now);
        await createAdminAuditEvent(
          {
            actionKey: "hacker.application_withdrawn",
            actor: participantActor(
              ctx.session.userId,
              profile.firstName,
              profile.lastName,
            ),
            metadata: { status: "withdrawn" },
            subjects: [
              {
                relation: "primary",
                targetId: application.attendeeId,
                targetLabel: `${profile.firstName} ${profile.lastName}`,
                targetType: "hacker_attendee",
              },
            ],
          },
          tx,
        );
        return mutationResult(tx, ctx);
      },
    }),
  );
}

export async function getCheckInPass(
  ctx: AuthenticatedPortalContext,
  input: { idempotencyKey: string },
) {
  return db.transaction(async (tx) =>
    runParticipantCommand<CheckInPassDto>({
      hackathonId: ctx.session.hackathonId,
      idempotencyKey: input.idempotencyKey,
      input,
      operation: "issue_check_in_pass",
      persistResult: ({ expiresAt, version }) => ({ expiresAt, version }),
      replayResult: (stored, command) => {
        if (
          !stored ||
          typeof stored !== "object" ||
          !("expiresAt" in stored) ||
          !("version" in stored) ||
          (stored.expiresAt !== null && typeof stored.expiresAt !== "string") ||
          typeof stored.version !== "number"
        ) {
          throw new Error("Stored check-in pass command result is invalid.");
        }
        return {
          expiresAt: stored.expiresAt,
          payload: deriveOpaqueHackerCheckInPass({
            commandId: command.id,
            hackathonId: ctx.session.hackathonId,
            userId: ctx.session.userId,
          }),
          version: stored.version,
        };
      },
      tx,
      userId: ctx.session.userId,
      work: async (command) => {
        const hackathon = await lockedHackathon(tx, ctx.session.hackathonId);
        const application = await loadParticipantApplication(
          ctx.session.userId,
          ctx.session.hackathonId,
          tx,
        );
        if (
          !application ||
          !["confirmed", "checkedin"].includes(application.status)
        ) {
          portalFailure(
            "FORBIDDEN_STATUS",
            "A check-in pass is available after confirmation.",
            { trpcCode: "FORBIDDEN" },
          );
        }
        const now = new Date(hackathon.databaseNow);
        await revokeActivePasses(tx, application.attendeeId, now);
        const payload = deriveOpaqueHackerCheckInPass({
          commandId: command.id,
          hackathonId: ctx.session.hackathonId,
          userId: ctx.session.userId,
        });
        const [pass] = await tx
          .insert(HackerCheckInPass)
          .values({
            attendeeId: application.attendeeId,
            hackathonId: hackathon.id,
            tokenHash: createHash("sha256").update(payload).digest("hex"),
            version: 1,
          })
          .returning({
            expiresAt: HackerCheckInPass.expiresAt,
            version: HackerCheckInPass.version,
          });
        if (!pass) throw new Error("Failed to issue check-in pass.");
        await createAdminAuditEvent(
          {
            actionKey: "hacker.check_in_pass_issued",
            actor: participantActor(ctx.session.userId),
            metadata: { version: pass.version },
            subjects: [
              {
                relation: "primary",
                targetId: application.attendeeId,
                targetLabel: hackathon.displayName,
                targetType: "hacker_attendee",
              },
            ],
          },
          tx,
        );
        return {
          expiresAt: pass.expiresAt?.toISOString() ?? null,
          payload,
          version: pass.version,
        };
      },
    }),
  );
}
