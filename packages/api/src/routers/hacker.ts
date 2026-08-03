import { TRPCError } from "@trpc/server";

import type { SQL } from "@forge/db";
import type { HackerRosterFilter } from "@forge/validators";
import {
  and,
  count,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
} from "@forge/db";
import { db } from "@forge/db/client";
import {
  EmailSend,
  Hackathon,
  HackathonStatusEmail,
  Hacker,
  HackerAttendee,
} from "@forge/db/schemas/knight-hacks";
import {
  HACKATHON_SENDING_STATUSES,
  hackerBulkPreviewSchema,
  hackerRosterCountsSchema,
  hackerRosterListSchema,
  hackerSelectionSurvivalSchema,
  hackerSetBlacklistSchema,
  hackerSetStatusSchema,
} from "@forge/validators";

import type { WriteDb } from "../utils/db";
import type { StatusMailRecipient } from "../utils/hacker/status-mail";
import { createTRPCRouter, permProcedure } from "../trpc";
import {
  captureAdminAuditActor,
  createAdminAuditEvent,
} from "../utils/audit/service";
import {
  prepareStatusMail,
  writeStatusMail,
} from "../utils/hacker/status-mail";
import { assertCanManagePlatformConfig } from "../utils/platform-config/access";

/**
 * The columns the roster reads.
 *
 * `blacklistReason` is included because the roster is the one screen allowed to
 * show it. Nothing here may be lifted into a member-facing or SDK procedure —
 * the flag is a judgement about a person recorded where they cannot see it.
 */
const ROSTER_COLUMNS = {
  attendeeId: HackerAttendee.id,
  blacklistReason: HackerAttendee.blacklistReason,
  blacklistedAt: HackerAttendee.blacklistedAt,
  discordUser: Hacker.discordUser,
  email: Hacker.email,
  firstName: Hacker.firstName,
  gradDate: Hacker.gradDate,
  lastName: Hacker.lastName,
  levelOfStudy: Hacker.levelOfStudy,
  phoneNumber: Hacker.phoneNumber,
  points: HackerAttendee.points,
  school: Hacker.school,
  // Read from the send this attendee's mail rode on, never from
  // `EmailSendRecipient` — those rows are deleted once a send passes retention,
  // so a join through them would stop resolving exactly when an officer is
  // looking for who never got told.
  sendError: EmailSend.safeError,
  sendStatus: EmailSend.status,
  status: HackerAttendee.status,
} as const;

/** Every filter the roster supports, composed as AND. */
function rosterWhere(hackathonId: string, filter: HackerRosterFilter) {
  const clauses: (SQL | undefined)[] = [
    eq(HackerAttendee.hackathonId, hackathonId),
  ];

  if (filter.status) clauses.push(eq(HackerAttendee.status, filter.status));
  // `sql` rather than `eq`: both columns are typed as unions of several
  // thousand literal values, so `eq` demands a member of that union while the
  // filter carries whatever the officer picked. The comparison is identical;
  // only the type-level narrowing differs.
  if (filter.school) clauses.push(sql`${Hacker.school} = ${filter.school}`);
  if (filter.levelOfStudy) {
    clauses.push(sql`${Hacker.levelOfStudy} = ${filter.levelOfStudy}`);
  }
  if (filter.graduationYear !== undefined) {
    clauses.push(
      sql`extract(year from ${Hacker.gradDate}) = ${filter.graduationYear}`,
    );
  }
  if (filter.blacklisted !== undefined) {
    clauses.push(
      filter.blacklisted
        ? isNotNull(HackerAttendee.blacklistedAt)
        : isNull(HackerAttendee.blacklistedAt),
    );
  }
  if (filter.deliveryFailed) clauses.push(eq(EmailSend.status, "failed"));
  if (filter.search) {
    const term = `%${filter.search.toLowerCase()}%`;
    clauses.push(
      or(
        sql`lower(${Hacker.firstName}) like ${term}`,
        sql`lower(${Hacker.lastName}) like ${term}`,
        sql`lower(${Hacker.email}) like ${term}`,
      ),
    );
  }

  return and(...clauses);
}

/**
 * Keyset pagination on `id`.
 *
 * Ordered by id rather than `timeApplied` because the cursor has to be unique
 * and stable: two applicants sharing a timestamp would make an offsetless page
 * boundary either repeat or skip them.
 */
function cursorAfter(cursor: string | undefined) {
  return cursor ? gt(HackerAttendee.id, cursor) : undefined;
}

/**
 * Attendees plus the hacker record, and the send their last status mail rode.
 *
 * `leftJoin` on the send: most attendees have never been mailed, and an inner
 * join would silently hide every one of them.
 */
function rosterQuery(executor: WriteDb = db) {
  return executor
    .select(ROSTER_COLUMNS)
    .from(HackerAttendee)
    .innerJoin(Hacker, eq(Hacker.id, HackerAttendee.hackerId))
    .leftJoin(EmailSend, eq(EmailSend.id, HackerAttendee.lastStatusSendId));
}

/** Unlocked pre-read, only to decide which hackathon's mail to compile. */
async function requireAttendee(attendeeId: string) {
  const [attendee] = await db
    .select({ hackathonId: HackerAttendee.hackathonId })
    .from(HackerAttendee)
    .where(eq(HackerAttendee.id, attendeeId))
    .limit(1);
  if (!attendee) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Applicant not found." });
  }
  return attendee;
}

async function requireHackathon(id: string) {
  const hackathon = await db.query.Hackathon.findFirst({
    columns: {
      applicationUrl: true,
      confirmationDeadline: true,
      displayName: true,
      endDate: true,
      id: true,
      name: true,
      startDate: true,
    },
    where: eq(Hackathon.id, id),
  });
  if (!hackathon) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Hackathon not found." });
  }
  return hackathon;
}

/**
 * Refuses a transition that would send mail from a hackathon whose mail is not
 * fully configured.
 *
 * Only transitions that send are gated. Blacklisting, reading, and the counts
 * stay available — an officer triaging a half-configured hackathon is doing
 * something legitimate, and blocking that would push them back to spreadsheets.
 */
async function assertHackathonReady(executor: WriteDb, hackathonId: string) {
  const [configured] = await executor
    .select({ configuredCount: count() })
    .from(HackathonStatusEmail)
    .where(eq(HackathonStatusEmail.hackathonId, hackathonId));

  const configuredCount = configured?.configuredCount ?? 0;
  if (configuredCount < HACKATHON_SENDING_STATUSES.length) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `This hackathon has ${configuredCount} of ${HACKATHON_SENDING_STATUSES.length} status emails configured. Finish configuring it before changing anyone's status.`,
    });
  }
}

/** Why a selected applicant was left out of a bulk action. */
type SkipReason = "already" | "blacklisted" | "missing" | "no_email";

interface BulkSkip {
  attendeeId: string;
  name: string;
  reason: SkipReason;
}

export const hackerRouter = createTRPCRouter({
  /** Officer-only. One page of the roster, or the whole filtered set. */
  listForHackathon: permProcedure
    .input(hackerRosterListSchema)
    .query(async ({ ctx, input }) => {
      assertCanManagePlatformConfig(ctx.session.permissions);
      await requireHackathon(input.hackathonId);

      // One extra row, to know whether another page exists without a second
      // count query.
      const rows = await rosterQuery()
        .where(
          and(
            rosterWhere(input.hackathonId, input.filter),
            cursorAfter(input.cursor),
          ),
        )
        .orderBy(HackerAttendee.id)
        .limit(input.limit + 1);

      const page = rows.slice(0, input.limit);
      return {
        hackers: page.map((row) => ({
          ...row,
          blacklisted: row.blacklistedAt !== null,
          deliveryFailed: row.sendStatus === "failed",
          name: `${row.firstName} ${row.lastName}`.trim(),
        })),
        // Null when this is the last page, so a caller can stop without
        // requesting an empty one.
        nextCursor: rows.length > input.limit ? page.at(-1)?.attendeeId : null,
      };
    }),

  /** Officer-only. One grouped query, not one per status. */
  statusCounts: permProcedure
    .input(hackerRosterCountsSchema)
    .query(async ({ ctx, input }) => {
      assertCanManagePlatformConfig(ctx.session.permissions);
      await requireHackathon(input.hackathonId);

      // `status` is stripped: this query groups *by* status, so applying it as
      // a filter collapses the result to the one bucket already selected and
      // every other count renders zero — leaving an officer who filtered to
      // "Applied" with no way to see, or click back to, anything else.
      const { status: _selected, ...countable } = input.filter;
      const rows = await db
        .select({
          status: HackerAttendee.status,
          total: count(),
        })
        .from(HackerAttendee)
        .innerJoin(Hacker, eq(Hacker.id, HackerAttendee.hackerId))
        .leftJoin(EmailSend, eq(EmailSend.id, HackerAttendee.lastStatusSendId))
        .where(rosterWhere(input.hackathonId, countable))
        .groupBy(HackerAttendee.status);

      return {
        byStatus: Object.fromEntries(
          rows.map((row) => [row.status, row.total]),
        ),
        total: rows.reduce((sum, row) => sum + row.total, 0),
      };
    }),

  /**
   * Officer-only. Which of a set of selected applicants survive a prospective
   * filter.
   *
   * Answered here rather than in the browser because the client only knows the
   * rows it has loaded, and the case that matters is a selected row sitting on
   * a page nobody is looking at.
   */
  selectionSurvival: permProcedure
    .input(hackerSelectionSurvivalSchema)
    .query(async ({ ctx, input }) => {
      assertCanManagePlatformConfig(ctx.session.permissions);

      const rows = await rosterQuery().where(
        and(
          rosterWhere(input.hackathonId, input.filter),
          inArray(HackerAttendee.id, input.attendeeIds),
        ),
      );

      const surviving = new Set(rows.map((row) => row.attendeeId));
      return {
        droppedIds: input.attendeeIds.filter((id) => !surviving.has(id)),
        survivingIds: [...surviving],
      };
    }),

  /** Officer-only. Moves one applicant and queues the mail for the new status. */
  setStatus: permProcedure
    .input(hackerSetStatusSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManagePlatformConfig(ctx.session.permissions);
      const auditActor = await captureAdminAuditActor(ctx.session.user);

      // Everything read here, before the transaction opens. A pooled read
      // issued while a transaction holds a connection can exhaust the pool and
      // hang every query in the process — `pg-pool` is `max: 10` with no
      // connection timeout, so ten concurrent status changes would each hold
      // one connection and wait forever for another.
      const existing = await requireAttendee(input.attendeeId);
      await assertHackathonReady(db, existing.hackathonId);
      const hackathon = await requireHackathon(existing.hackathonId);
      const prepared = await prepareStatusMail({
        hackathon,
        status: input.status,
      });

      return db.transaction(async (tx) => {
        // Re-read under a lock. The pre-read above only decided *which*
        // hackathon's mail to compile; this is the authoritative state, so a
        // concurrent blacklist or transition lands here rather than being
        // missed.
        const [attendee] = await tx
          .select({
            blacklistedAt: HackerAttendee.blacklistedAt,
            email: Hacker.email,
            firstName: Hacker.firstName,
            hackathonId: HackerAttendee.hackathonId,
            lastName: Hacker.lastName,
            status: HackerAttendee.status,
          })
          .from(HackerAttendee)
          .innerJoin(Hacker, eq(Hacker.id, HackerAttendee.hackerId))
          .where(eq(HackerAttendee.id, input.attendeeId))
          .for("update")
          .limit(1);

        if (!attendee) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Applicant not found.",
          });
        }

        // A blacklisted applicant can still be capacity-rejected — that is how
        // they leave the funnel — but nothing else.
        if (attendee.blacklistedAt && input.status !== "denied") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "This applicant is blacklisted. Remove the blacklist first, or reject them for capacity.",
          });
        }

        // Already there. Re-sending an acceptance to someone who was accepted
        // an hour ago is the kind of mistake a double-click makes, and it is
        // not recallable.
        if (attendee.status === input.status) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `That applicant is already ${input.status}.`,
          });
        }

        const sendId = await writeStatusMail(
          tx,
          prepared,
          ctx.session.user.id,
          [
            {
              attendeeId: input.attendeeId,
              email: attendee.email,
              firstName: attendee.firstName,
              name: `${attendee.firstName} ${attendee.lastName}`.trim(),
              status: input.status,
            },
          ],
        );

        await tx
          .update(HackerAttendee)
          .set({ lastStatusSendId: sendId, status: input.status })
          .where(eq(HackerAttendee.id, input.attendeeId));

        await createAdminAuditEvent(
          {
            actionKey: "hacker.status_changed",
            actor: auditActor,
            changes: [
              {
                after: input.status,
                before: attendee.status,
                field: "status",
              },
            ],
            metadata: {
              previousStatus: attendee.status,
              sendId,
              status: input.status,
            },
            subjects: [
              {
                relation: "primary",
                targetId: input.attendeeId,
                targetLabel:
                  `${attendee.firstName} ${attendee.lastName}`.trim(),
                targetType: "hacker_attendee",
              },
            ],
          },
          tx,
        );

        return { sendId, status: input.status };
      });
    }),

  /**
   * Officer-only. Who a bulk action would move and who it would skip.
   *
   * Writes nothing. Mirrors the email portal's preview step, which is the
   * interaction officers already know for "you are about to mail a lot of
   * people".
   */
  previewBulk: permProcedure
    .input(hackerBulkPreviewSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManagePlatformConfig(ctx.session.permissions);
      await requireHackathon(input.hackathonId);
      await assertHackathonReady(db, input.hackathonId);

      const { sending, skipped } = await resolveBulkTargets(db, input);

      return {
        sending: sending.map((row) => ({
          attendeeId: row.attendeeId,
          email: row.email,
          name: row.name,
        })),
        skipped,
        status: input.status,
      };
    }),

  /**
   * Officer-only. Applies the bulk action.
   *
   * Takes the same selection the preview took, not a stored preview id. The
   * SRD proposed a `previewVersion` handle; carrying one would mean persisting
   * a preview row with its own lifecycle and expiry for no gain, because the
   * ids *are* the selection. Re-resolving eligibility here is also strictly
   * fresher: someone blacklisted between preview and confirm is caught and
   * named, which is what AC-029 asks for. A frozen snapshot would have acted on
   * eligibility that was already stale.
   *
   * Best-effort by construction: ineligible applicants are skipped and named,
   * and the rest still move. Nothing rolls back on a skip — mail already queued
   * cannot be unqueued, and refusing the whole batch because one person is
   * blacklisted would be worse.
   */
  confirmBulk: permProcedure
    .input(hackerBulkPreviewSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManagePlatformConfig(ctx.session.permissions);
      const hackathon = await requireHackathon(input.hackathonId);
      const auditActor = await captureAdminAuditActor(ctx.session.user);

      // Read and compiled before the transaction, for the pool reason above.
      await assertHackathonReady(db, input.hackathonId);
      const prepared = await prepareStatusMail({
        hackathon,
        status: input.status,
      });

      return db.transaction(async (tx) => {
        const { sending, skipped } = await resolveBulkTargets(tx, input, true);

        if (sending.length === 0) {
          return { movedCount: 0, sendId: null, skipped };
        }

        const sendId = await writeStatusMail(
          tx,
          prepared,
          ctx.session.user.id,
          sending,
        );

        await tx
          .update(HackerAttendee)
          .set({ lastStatusSendId: sendId, status: input.status })
          .where(
            inArray(
              HackerAttendee.id,
              sending.map((row) => row.attendeeId),
            ),
          );

        // One event for the officer's single act, with counts rather than a
        // list — a bulk of two hundred would otherwise write a payload nobody
        // reads.
        await createAdminAuditEvent(
          {
            actionKey: "hacker.bulk_status_changed",
            actor: auditActor,
            metadata: {
              movedCount: sending.length,
              sendId,
              skippedCount: skipped.length,
              status: input.status,
            },
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

        return { movedCount: sending.length, sendId, skipped };
      });
    }),

  /** Officer-only. Sets or clears the blacklist. Never touches status. */
  setBlacklist: permProcedure
    .input(hackerSetBlacklistSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManagePlatformConfig(ctx.session.permissions);
      const auditActor = await captureAdminAuditActor(ctx.session.user);

      return db.transaction(async (tx) => {
        const [attendee] = await tx
          .select({
            firstName: Hacker.firstName,
            lastName: Hacker.lastName,
          })
          .from(HackerAttendee)
          .innerJoin(Hacker, eq(Hacker.id, HackerAttendee.hackerId))
          .where(eq(HackerAttendee.id, input.attendeeId))
          .for("update")
          .limit(1);

        if (!attendee) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Applicant not found.",
          });
        }

        // `status` is deliberately absent from both branches. The flag sits
        // beside the funnel rather than in it.
        await tx
          .update(HackerAttendee)
          .set(
            input.blacklisted
              ? {
                  blacklistReason: input.reason,
                  blacklistedAt: new Date(),
                  blacklistedBy: ctx.session.user.id,
                }
              : {
                  blacklistReason: null,
                  blacklistedAt: null,
                  blacklistedBy: null,
                },
          )
          .where(eq(HackerAttendee.id, input.attendeeId));

        const label = `${attendee.firstName} ${attendee.lastName}`.trim();
        await createAdminAuditEvent(
          {
            actionKey: input.blacklisted
              ? "hacker.blacklisted"
              : "hacker.unblacklisted",
            actor: auditActor,
            // Recorded here as well as on the row, because the row's reason is
            // overwritten by the next blacklist and the log is what survives.
            metadata: input.blacklisted ? { reason: input.reason } : {},
            subjects: [
              {
                relation: "primary",
                targetId: input.attendeeId,
                targetLabel: label,
                targetType: "hacker_attendee",
              },
            ],
          },
          tx,
        );

        return { blacklisted: input.blacklisted };
      });
    }),
});

/**
 * Splits a selection into who will be mailed and who will not, with reasons.
 *
 * Shared by preview and confirm so the two cannot disagree about eligibility —
 * a preview that promised to move someone the confirm then skips is worse than
 * no preview.
 */
async function resolveBulkTargets(
  executor: WriteDb,
  input: {
    attendeeIds: string[];
    hackathonId: string;
    status:
      | "accepted"
      | "confirmed"
      | "denied"
      | "pending"
      | "waitlisted"
      | "withdrawn";
  },
  lock = false,
): Promise<{ sending: StatusMailRecipient[]; skipped: BulkSkip[] }> {
  const base = executor
    .select({
      attendeeId: HackerAttendee.id,
      blacklistedAt: HackerAttendee.blacklistedAt,
      email: Hacker.email,
      firstName: Hacker.firstName,
      lastName: Hacker.lastName,
      status: HackerAttendee.status,
    })
    .from(HackerAttendee)
    .innerJoin(Hacker, eq(Hacker.id, HackerAttendee.hackerId))
    .where(
      and(
        eq(HackerAttendee.hackathonId, input.hackathonId),
        inArray(HackerAttendee.id, input.attendeeIds),
      ),
    );

  const rows = await (lock ? base.for("update") : base);

  const found = new Map(rows.map((row) => [row.attendeeId, row]));
  const sending: StatusMailRecipient[] = [];
  const skipped: BulkSkip[] = [];

  // Deduplicated: a client can send the same id twice, and each duplicate
  // would otherwise become a second recipient row and abort the whole bulk on
  // the `(sendId, normalizedEmail)` unique constraint.
  for (const attendeeId of [...new Set(input.attendeeIds)]) {
    const row = found.get(attendeeId);
    // Selected but no longer in this hackathon's roster — withdrawn on the hack
    // site, or deleted between selecting and confirming.
    if (!row) {
      skipped.push({
        attendeeId,
        name: "Unknown applicant",
        reason: "missing",
      });
      continue;
    }
    const name = `${row.firstName} ${row.lastName}`.trim();
    if (row.blacklistedAt && input.status !== "denied") {
      skipped.push({ attendeeId, name, reason: "blacklisted" });
      continue;
    }
    if (!row.email.trim()) {
      skipped.push({ attendeeId, name, reason: "no_email" });
      continue;
    }
    // Already there. An officer who filters to Accepted, selects all, and
    // clicks Accept would otherwise send every one of them a second
    // acceptance — and mail already queued cannot be recalled.
    if (row.status === input.status) {
      skipped.push({ attendeeId, name, reason: "already" });
      continue;
    }
    sending.push({
      attendeeId,
      email: row.email,
      firstName: row.firstName,
      name,
      status: input.status,
    });
  }

  return { sending, skipped };
}
