import { TRPCError } from "@trpc/server";

import { and, count, desc, eq, isNotNull, sql } from "@forge/db";
import { db } from "@forge/db/client";
import {
  EmailTemplate,
  Hackathon,
  HackathonClass,
  HackathonStatusEmail,
  HackerAttendee,
} from "@forge/db/schemas/knight-hacks";
// From `@forge/email/fields`, not the package root: the root pulls in the
// template compiler and with it the whole TypeScript compiler, purely to
// regex-match `{{field.path}}`.
import { assertSubjectFieldsAllowed } from "@forge/email/fields";
import {
  deriveHackathonRouteName,
  getHackathonDateWindowIssues,
  HACKATHON_SENDING_STATUSES,
  hackathonClassCreateSchema,
  hackathonClassIdSchema,
  hackathonClassUpdateSchema,
  hackathonCreateSchema,
  hackathonIdSchema,
  hackathonStatusEmailClearSchema,
  hackathonStatusEmailSetSchema,
  hackathonUpdateSchema,
} from "@forge/validators";

import type { AuditChangeInput } from "../utils/audit/service";
import type { WriteDb } from "../utils/db";
import { createTRPCRouter, permProcedure } from "../trpc";
import {
  captureAdminAuditActor,
  createAdminAuditEvent,
} from "../utils/audit/service";
import { assertCanManagePlatformConfig } from "../utils/platform-config/access";

/**
 * A hackathon is *configured* only when every sending status has mail. There is
 * no per-status optionality: a half-configured hackathon would accept some
 * status changes and refuse others, which is harder to reason about than a
 * single yes-or-no.
 *
 * Computed server-side and returned with the list so the screen never
 * recomputes it — two implementations of "is this ready" would eventually
 * disagree, and hacker management reads the same answer.
 */
function isConfigured(configuredStatusCount: number) {
  return configuredStatusCount === HACKATHON_SENDING_STATUSES.length;
}

/**
 * The four retired columns are excluded deliberately, not incidentally.
 * "No Reforge code path reads these" is the stated precondition for dropping
 * them at cutover, and a bare `findFirst` would hand them to any future
 * component — which would typecheck today and break the moment the column goes.
 */
const HACKATHON_COLUMNS = {
  applicationDeadline: true,
  applicationOpen: true,
  applicationUrl: true,
  confirmationDeadline: true,
  displayName: true,
  endDate: true,
  id: true,
  startDate: true,
  theme: true,
} as const;

/**
 * The same allowlist shaped for `.returning()`, which takes columns rather than
 * the boolean map `findFirst` wants. A bare `.returning()` on create/update
 * would hand back all four retired columns and defeat the point of the map
 * above — the invariant is "no Reforge read path", not "no Reforge query".
 */
const HACKATHON_RETURNING = {
  applicationDeadline: Hackathon.applicationDeadline,
  applicationOpen: Hackathon.applicationOpen,
  applicationUrl: Hackathon.applicationUrl,
  confirmationDeadline: Hackathon.confirmationDeadline,
  displayName: Hackathon.displayName,
  endDate: Hackathon.endDate,
  id: Hackathon.id,
  startDate: Hackathon.startDate,
  theme: Hackathon.theme,
} as const;

async function requireHackathon(id: string) {
  const hackathon = await db.query.Hackathon.findFirst({
    columns: HACKATHON_COLUMNS,
    where: eq(Hackathon.id, id),
  });
  if (!hackathon) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Hackathon not found." });
  }
  return hackathon;
}

/**
 * `Hackathon.name` is `NOT NULL UNIQUE` and production Blade still routes on
 * it, so a value has to exist even though officers no longer choose one and no
 * Reforge code reads it.
 *
 * Allocated **on create only**. Re-deriving it on update would rewrite a live
 * production route every time an officer corrected a display-name typo — the
 * database is shared, so `/hacker/application/bloomknights-2026` would start
 * 404ing because someone added a space. `update` preserves whatever is stored.
 *
 * Runs inside the caller's transaction so the read and the insert cannot be
 * interleaved by a concurrent create; the unique violation is still caught
 * below as a backstop.
 */
async function allocateRouteName(tx: WriteDb, displayName: string) {
  const base = deriveHackathonRouteName(displayName) || "hackathon";
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const [existing] = await tx
      .select({ id: Hackathon.id })
      .from(Hackathon)
      .where(eq(Hackathon.name, candidate))
      .limit(1);
    if (!existing) return candidate;
  }
  throw new TRPCError({
    code: "CONFLICT",
    message: `Too many hackathons named "${displayName}".`,
  });
}

/**
 * Postgres unique/exclusion violations reaching tRPC uncaught surface as
 * `INTERNAL_SERVER_ERROR`, which is exactly the "constraint name leaking to an
 * officer" the pre-checks exist to prevent. Under contention the pre-check
 * loses, so the constraint is the real guard and this maps it back to a message.
 */
function hasPgCode(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

function asConflict(error: unknown, message: string): never {
  if (hasPgCode(error, "23505")) {
    throw new TRPCError({ cause: error, code: "CONFLICT", message });
  }
  throw error;
}

/**
 * The `ON DELETE restrict` twin of `asConflict`. A referential-integrity
 * violation (`23503`) means a child row exists that the pre-delete count did
 * not see, so the officer-facing answer is the same "something still points at
 * this" sentence, not `PRECONDITION_FAILED`'s constraint name.
 */
function asRestrictConflict(error: unknown, message: string): never {
  if (hasPgCode(error, "23503")) {
    throw new TRPCError({
      cause: error,
      code: "PRECONDITION_FAILED",
      message,
    });
  }
  throw error;
}

/**
 * The fields `hackathon.updated` and `hackathon.class_updated` declare in
 * `packages/validators/src/audit.ts`. `validateActionPayload` rejects anything
 * not declared there, so these two lists have to agree — and an event that
 * carries no `changes` is a log entry saying only "something changed", which
 * for a `discordRoleId` repoint or a deadline moved a month earlier is the one
 * question the log exists to answer.
 */
const HACKATHON_CHANGE_FIELDS = [
  "displayName",
  "theme",
  "applicationUrl",
  "applicationOpen",
  "applicationDeadline",
  "confirmationDeadline",
  "startDate",
  "endDate",
] as const;

const HACKATHON_CLASS_CHANGE_FIELDS = [
  "name",
  "discordRoleId",
  "color",
] as const;

/**
 * Same shape `company.updated` uses: only fields that actually moved.
 *
 * Dates are serialised to ISO strings because the audit payload holds scalars,
 * and because "what was the deadline before" has to survive as a readable value
 * rather than whatever a `Date` happens to stringify to in a log viewer.
 */
function auditValue(value: Date | string | null): string | null {
  return value instanceof Date ? value.toISOString() : value;
}

function diffChanges<Field extends string>(
  before: Record<Field, Date | string | null>,
  after: Record<Field, Date | string | null>,
  fields: readonly Field[],
): AuditChangeInput[] {
  return fields.flatMap((field) => {
    const from = auditValue(before[field]);
    const to = auditValue(after[field]);
    return from === to ? [] : [{ after: to, before: from, field }];
  });
}

function assertDateWindow(input: {
  applicationDeadline: Date;
  applicationOpen: Date;
  confirmationDeadline: Date;
  endDate: Date;
  startDate: Date;
}) {
  const [issue] = getHackathonDateWindowIssues(input);
  if (issue) {
    throw new TRPCError({ code: "BAD_REQUEST", message: issue.message });
  }
}

export const hackathonRouter = createTRPCRouter({
  /** Officer-only. Every hackathon, newest first, with whether its mail is complete. */
  list: permProcedure.query(async ({ ctx }) => {
    assertCanManagePlatformConfig(ctx.session.permissions);

    const [hackathons, statusCounts] = await Promise.all([
      db
        .select({
          applicationUrl: Hackathon.applicationUrl,
          displayName: Hackathon.displayName,
          endDate: Hackathon.endDate,
          id: Hackathon.id,
          startDate: Hackathon.startDate,
          theme: Hackathon.theme,
        })
        .from(Hackathon)
        .orderBy(desc(Hackathon.startDate)),
      // One grouped read rather than a query per hackathon; the list is the
      // screen most likely to grow an N+1.
      db
        .select({
          configuredStatusCount: count(),
          hackathonId: HackathonStatusEmail.hackathonId,
        })
        .from(HackathonStatusEmail)
        .groupBy(HackathonStatusEmail.hackathonId),
    ]);

    const configuredByHackathon = new Map(
      statusCounts.map((row) => [row.hackathonId, row.configuredStatusCount]),
    );

    return hackathons.map((hackathon) => {
      const configuredStatusCount =
        configuredByHackathon.get(hackathon.id) ?? 0;
      return {
        applicationUrl: hackathon.applicationUrl,
        configuredStatusCount,
        displayName: hackathon.displayName,
        endDate: hackathon.endDate,
        id: hackathon.id,
        isConfigured: isConfigured(configuredStatusCount),
        requiredStatusCount: HACKATHON_SENDING_STATUSES.length,
        startDate: hackathon.startDate,
        theme: hackathon.theme,
      };
    });
  }),

  /** Officer-only. One hackathon with its status mail and classes. */
  get: permProcedure.input(hackathonIdSchema).query(async ({ ctx, input }) => {
    assertCanManagePlatformConfig(ctx.session.permissions);
    const hackathon = await requireHackathon(input.id);

    const [statusEmails, classes] = await Promise.all([
      db
        .select({
          status: HackathonStatusEmail.status,
          subject: HackathonStatusEmail.subject,
          // Both surfaced so the screen can say which of the two went wrong.
          // The `restrict` FK cannot see a soft delete, and it cannot see a
          // domain change at all, so neither is visible without asking.
          //
          // Read from the join rather than inferred client-side by checking
          // whether the id appears in the picker list: that list is capped, so
          // absence from it would accuse a valid binding of being retired.
          templateArchived: sql<boolean>`${EmailTemplate.archivedAt} is not null`,
          templateDomain: EmailTemplate.domain,
          templateId: HackathonStatusEmail.templateId,
          templateName: EmailTemplate.name,
        })
        .from(HackathonStatusEmail)
        .innerJoin(
          EmailTemplate,
          eq(EmailTemplate.id, HackathonStatusEmail.templateId),
        )
        .where(eq(HackathonStatusEmail.hackathonId, hackathon.id))
        .orderBy(HackathonStatusEmail.status),
      db
        .select({
          color: HackathonClass.color,
          discordRoleId: HackathonClass.discordRoleId,
          id: HackathonClass.id,
          kind: HackathonClass.kind,
          name: HackathonClass.name,
        })
        .from(HackathonClass)
        .where(eq(HackathonClass.hackathonId, hackathon.id))
        // Without an explicit order Postgres returns heap order, so deleting a
        // class and adding another visibly reshuffles the list on the next
        // refresh with nothing on screen explaining why. VIP sorts last because
        // it is one entry that behaves differently from the flat class list.
        .orderBy(HackathonClass.kind, HackathonClass.name),
    ]);

    // Reads zero until check-in exists to assign anyone. The screen says so
    // rather than implying the split is live.
    const memberCounts = await db
      .select({
        classId: HackerAttendee.classId,
        memberCount: count(),
      })
      .from(HackerAttendee)
      .where(
        and(
          eq(HackerAttendee.hackathonId, hackathon.id),
          isNotNull(HackerAttendee.classId),
        ),
      )
      .groupBy(HackerAttendee.classId);

    const countByClass = new Map(
      memberCounts.map((row) => [row.classId, row.memberCount]),
    );

    // The same predicate `remove` enforces. Returned so the screen can disable
    // the button and say why, rather than offering a delete that the server
    // will refuse — the confirmation dialog claims deletion is only allowed
    // before anyone applies, and without this it has no way to know.
    const [applications] = await db
      .select({ applicationCount: count() })
      .from(HackerAttendee)
      .where(eq(HackerAttendee.hackathonId, hackathon.id));

    return {
      applicationCount: applications?.applicationCount ?? 0,
      classes: classes.map((hackathonClass) => ({
        ...hackathonClass,
        memberCount: countByClass.get(hackathonClass.id) ?? 0,
      })),
      hackathon,
      isConfigured: isConfigured(statusEmails.length),
      sendingStatuses: HACKATHON_SENDING_STATUSES,
      statusEmails,
    };
  }),

  /** Officer-only. Creates a hackathon; its mail and classes are configured after. */
  create: permProcedure
    .input(hackathonCreateSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManagePlatformConfig(ctx.session.permissions);
      assertDateWindow(input);
      const auditActor = await captureAdminAuditActor(ctx.session.user);

      return db.transaction(async (tx) => {
        const name = await allocateRouteName(tx, input.displayName);
        const [created] = await tx
          .insert(Hackathon)
          .values({ ...input, name })
          .returning(HACKATHON_RETURNING)
          // The only unique constraint on this table is on the derived route
          // name, so the message names that — not the display name, which is
          // not unique and which the officer would otherwise be told to change
          // for no reason. Retrying the identical input succeeds, because
          // `allocateRouteName` picks the next free suffix.
          .catch((error: unknown) =>
            asConflict(
              error,
              `The route name "${name}" was just taken by another hackathon. Try saving again.`,
            ),
          );
        if (!created) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not create the hackathon.",
          });
        }

        await createAdminAuditEvent(
          {
            actionKey: "hackathon.created",
            actor: auditActor,
            subjects: [
              {
                relation: "primary",
                targetId: created.id,
                targetLabel: created.displayName,
                targetType: "hackathon",
              },
            ],
          },
          tx,
        );

        return created;
      });
    }),

  /** Officer-only. Edits identity, dates, and the application link. */
  update: permProcedure
    .input(hackathonUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManagePlatformConfig(ctx.session.permissions);
      assertDateWindow(input);
      const { id, ...fields } = input;
      const auditActor = await captureAdminAuditActor(ctx.session.user);

      return db.transaction(async (tx) => {
        // Read and locked inside the transaction, matching `updateClass`. An
        // unlocked read outside it means a concurrent edit landing in between
        // makes the audit diff name a value this update did not replace — the
        // one thing the diff exists to answer.
        const [before] = await tx
          .select(HACKATHON_RETURNING)
          .from(Hackathon)
          .where(eq(Hackathon.id, id))
          .for("update")
          .limit(1);
        if (!before) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Hackathon not found.",
          });
        }

        // `name` is deliberately absent: production Blade routes on it, and
        // re-deriving it here would 404 live links on a display-name typo fix.
        const [updated] = await tx
          .update(Hackathon)
          .set(fields)
          .where(eq(Hackathon.id, id))
          .returning(HACKATHON_RETURNING);
        if (!updated) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Hackathon not found.",
          });
        }

        await createAdminAuditEvent(
          {
            actionKey: "hackathon.updated",
            actor: auditActor,
            changes: diffChanges(before, updated, HACKATHON_CHANGE_FIELDS),
            subjects: [
              {
                relation: "primary",
                targetId: updated.id,
                targetLabel: updated.displayName,
                targetType: "hackathon",
              },
            ],
          },
          tx,
        );

        return updated;
      });
    }),

  /**
   * Officer-only. Deletes a hackathon that nobody has applied to.
   *
   * The first application makes it permanent: `HackerAttendee` cascades, so
   * deleting later would silently destroy every application with it.
   */
  remove: permProcedure
    .input(hackathonIdSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManagePlatformConfig(ctx.session.permissions);
      const hackathon = await requireHackathon(input.id);
      const auditActor = await captureAdminAuditActor(ctx.session.user);

      await db.transaction(async (tx) => {
        // Locked and counted inside the transaction. `HackerAttendee` cascades,
        // so an application landing between an outside count and this delete
        // would be destroyed silently — the exact outcome the check prevents.
        // `FOR UPDATE` conflicts with the `FOR KEY SHARE` an inserting child
        // takes, so the two serialise.
        await tx
          .select({ id: Hackathon.id })
          .from(Hackathon)
          .where(eq(Hackathon.id, hackathon.id))
          .for("update");

        const [applications] = await tx
          .select({ applicationCount: count() })
          .from(HackerAttendee)
          .where(eq(HackerAttendee.hackathonId, hackathon.id));

        if ((applications?.applicationCount ?? 0) > 0) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "This hackathon has applications, so it can no longer be deleted.",
          });
        }

        await tx.delete(Hackathon).where(eq(Hackathon.id, hackathon.id));
        await createAdminAuditEvent(
          {
            actionKey: "hackathon.deleted",
            actor: auditActor,
            subjects: [
              {
                relation: "primary",
                targetId: hackathon.id,
                targetLabel: hackathon.displayName,
                targetType: "hackathon",
              },
            ],
          },
          tx,
        );
      });

      return { id: hackathon.id };
    }),

  /** Officer-only. Sets the template and subject one status sends. Upserts. */
  setStatusEmail: permProcedure
    .input(hackathonStatusEmailSetSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManagePlatformConfig(ctx.session.permissions);
      const hackathon = await requireHackathon(input.hackathonId);

      // Subjects interpolate the same fields the body does, so a typo has to
      // fail here rather than reaching an applicant's inbox as raw syntax.
      // Pure input validation, so it needs no transaction.
      try {
        assertSubjectFieldsAllowed(input.subject, "hackathon");
      } catch (error) {
        throw new TRPCError({
          cause: error,
          code: "BAD_REQUEST",
          message:
            error instanceof Error ? error.message : "Invalid subject line.",
        });
      }

      const auditActor = await captureAdminAuditActor(ctx.session.user);

      return db.transaction(async (tx) => {
        // Locked and read INSIDE the transaction. `archiveTemplate` and
        // `saveTemplateDraft` both guard on "is this template bound", and both
        // take `FOR UPDATE` on this row first — so a check out here would race
        // them: their guard sees no binding, ours sees a live template, and both
        // commit, leaving a status pointed at an archived or club-domain
        // template that the FK cannot catch because nothing was deleted.
        //
        // Every path locks `EmailTemplate` before anything else, and nothing
        // locks `HackathonStatusEmail` ahead of it, so the ordering is
        // consistent and cannot deadlock.
        const [template] = await tx
          .select({
            archivedAt: EmailTemplate.archivedAt,
            domain: EmailTemplate.domain,
            // Recorded in the audit event as the name it had *then*: the
            // template can be renamed later and the log should not follow it.
            name: EmailTemplate.name,
          })
          .from(EmailTemplate)
          .where(eq(EmailTemplate.id, input.templateId))
          .for("update")
          .limit(1);
        if (!template) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Email template not found.",
          });
        }
        if (template.domain !== "hackathon") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Only hackathon templates can be used for hackathon status mail.",
          });
        }
        if (template.archivedAt) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "That template is archived. Restore it or choose another.",
          });
        }

        const [saved] = await tx
          .insert(HackathonStatusEmail)
          .values(input)
          .onConflictDoUpdate({
            set: { subject: input.subject, templateId: input.templateId },
            target: [
              HackathonStatusEmail.hackathonId,
              HackathonStatusEmail.status,
            ],
          })
          .returning();

        await createAdminAuditEvent(
          {
            actionKey: "hackathon.status_email_set",
            actor: auditActor,
            metadata: { status: input.status, templateName: template.name },
            subjects: [
              {
                relation: "primary",
                targetId: input.hackathonId,
                targetLabel: hackathon.displayName,
                targetType: "hackathon",
              },
            ],
          },
          tx,
        );

        return saved;
      });
    }),

  /** Officer-only. Removes one status's mail, returning the hackathon to unconfigured. */
  clearStatusEmail: permProcedure
    .input(hackathonStatusEmailClearSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManagePlatformConfig(ctx.session.permissions);
      const hackathon = await requireHackathon(input.hackathonId);
      const auditActor = await captureAdminAuditActor(ctx.session.user);

      await db.transaction(async (tx) => {
        const cleared = await tx
          .delete(HackathonStatusEmail)
          .where(
            and(
              eq(HackathonStatusEmail.hackathonId, input.hackathonId),
              eq(HackathonStatusEmail.status, input.status),
            ),
          )
          .returning({ status: HackathonStatusEmail.status });

        // Every other destructive procedure here verifies it acted. Without
        // this, two officers clearing the same status in sequence both get a
        // success toast and the log records a second clear that removed nothing
        // — an audit trail with an event for a change that never happened.
        if (cleared.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "That status has no email configured.",
          });
        }

        await createAdminAuditEvent(
          {
            actionKey: "hackathon.status_email_cleared",
            actor: auditActor,
            metadata: { status: input.status },
            subjects: [
              {
                relation: "primary",
                targetId: input.hackathonId,
                targetLabel: hackathon.displayName,
                targetType: "hackathon",
              },
            ],
          },
          tx,
        );
      });

      return { status: input.status };
    }),

  /**
   * Officer-only. Adds a class, or the hackathon's single VIP entry.
   *
   * A second VIP is refused by a partial unique index rather than a check here,
   * so it holds against a direct write too; this only turns the constraint into
   * a message an officer can act on.
   */
  createClass: permProcedure
    .input(hackathonClassCreateSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManagePlatformConfig(ctx.session.permissions);
      await requireHackathon(input.hackathonId);

      if (input.kind === "vip") {
        const existingVip = await db.query.HackathonClass.findFirst({
          columns: { id: true },
          where: and(
            eq(HackathonClass.hackathonId, input.hackathonId),
            eq(HackathonClass.kind, "vip"),
          ),
        });
        if (existingVip) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This hackathon already has a VIP entry.",
          });
        }
      }

      const auditActor = await captureAdminAuditActor(ctx.session.user);

      return db.transaction(async (tx) => {
        const [created] = await tx
          .insert(HackathonClass)
          .values(input)
          .returning()
          .catch((error: unknown) =>
            asConflict(error, "This hackathon already has a VIP entry."),
          );
        if (!created) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not create the class.",
          });
        }

        await createAdminAuditEvent(
          {
            actionKey: "hackathon.class_created",
            actor: auditActor,
            metadata: { kind: created.kind },
            subjects: [
              {
                relation: "primary",
                targetId: created.id,
                targetLabel: created.name,
                targetType: "hackathon_class",
              },
            ],
          },
          tx,
        );

        return created;
      });
    }),

  /** Officer-only. Edits a class's name, role, and colour. `kind` is fixed at creation. */
  updateClass: permProcedure
    .input(hackathonClassUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManagePlatformConfig(ctx.session.permissions);
      const { id, ...fields } = input;
      const auditActor = await captureAdminAuditActor(ctx.session.user);

      return db.transaction(async (tx) => {
        // Read before the write, in the same transaction, so the diff below
        // cannot be built from a row another officer has already moved.
        const [before] = await tx
          .select({
            color: HackathonClass.color,
            discordRoleId: HackathonClass.discordRoleId,
            name: HackathonClass.name,
          })
          .from(HackathonClass)
          .where(eq(HackathonClass.id, id))
          .for("update")
          .limit(1);
        if (!before) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Class not found.",
          });
        }

        const [updated] = await tx
          .update(HackathonClass)
          .set(fields)
          .where(eq(HackathonClass.id, id))
          .returning();
        if (!updated) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Class not found.",
          });
        }

        await createAdminAuditEvent(
          {
            actionKey: "hackathon.class_updated",
            actor: auditActor,
            changes: diffChanges(
              before,
              updated,
              HACKATHON_CLASS_CHANGE_FIELDS,
            ),
            subjects: [
              {
                relation: "primary",
                targetId: updated.id,
                targetLabel: updated.name,
                targetType: "hackathon_class",
              },
            ],
          },
          tx,
        );

        return updated;
      });
    }),

  /** Officer-only. Deletes a class nobody is assigned to. */
  removeClass: permProcedure
    .input(hackathonClassIdSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManagePlatformConfig(ctx.session.permissions);

      const hackathonClass = await db.query.HackathonClass.findFirst({
        where: eq(HackathonClass.id, input.id),
      });
      if (!hackathonClass) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found." });
      }

      const auditActor = await captureAdminAuditActor(ctx.session.user);

      await db.transaction(async (tx) => {
        // Lock the class row first, exactly as `remove` locks the hackathon.
        // Counting inside the transaction is not enough on its own: under READ
        // COMMITTED an in-flight check-in can insert a `HackerAttendee` row
        // after this count and commit before the delete, and the count would
        // never see it. Taking `FOR UPDATE` here conflicts with the `FOR KEY
        // SHARE` that insert takes on its FK parent, which serialises the two.
        const [locked] = await tx
          .select({ id: HackathonClass.id })
          .from(HackathonClass)
          .where(eq(HackathonClass.id, hackathonClass.id))
          .for("update")
          .limit(1);
        if (!locked) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Class not found.",
          });
        }

        const [assigned] = await tx
          .select({ memberCount: count() })
          .from(HackerAttendee)
          .where(eq(HackerAttendee.classId, hackathonClass.id));

        if ((assigned?.memberCount ?? 0) > 0) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Hackers are assigned to this class, so it can no longer be deleted.",
          });
        }

        await tx
          .delete(HackathonClass)
          .where(eq(HackathonClass.id, hackathonClass.id))
          // The lock above closes the race, but `ON DELETE restrict` is still
          // the last word. If it ever fires, the officer gets the same sentence
          // as the count guard rather than a raw constraint name.
          .catch((error: unknown) =>
            asRestrictConflict(
              error,
              "Hackers are assigned to this class, so it can no longer be deleted.",
            ),
          );
        await createAdminAuditEvent(
          {
            actionKey: "hackathon.class_deleted",
            actor: auditActor,
            subjects: [
              {
                relation: "primary",
                targetId: hackathonClass.id,
                targetLabel: hackathonClass.name,
                targetType: "hackathon_class",
              },
            ],
          },
          tx,
        );
      });

      return { id: hackathonClass.id };
    }),
});
