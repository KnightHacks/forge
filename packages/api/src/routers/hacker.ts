import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { SQL } from "@forge/db";
import type { HackerRosterFilter, SkipReason } from "@forge/validators";
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
import { User } from "@forge/db/schemas/auth";
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
  hackerFilterOptionsSchema,
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
  withheldByDevelopmentGate,
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
  // `in`, not `= any(...)`.
  //
  // Interpolating a JS array into drizzle's `sql` tag expands it to a
  // parenthesised *parameter list* — `($1, $2)` — which is exactly what `in`
  // wants and is not a Postgres array. Written as `= any(...)` it produced
  // `= any(($1, $2))`, and every filter 500'd with "malformed array literal"
  // on the first school an officer ticked.
  //
  // These stay in `sql` rather than `inArray` because both columns are typed as
  // unions of several thousand literals, while the filter carries whatever an
  // officer picked out of the data.
  if (filter.schools?.length) {
    clauses.push(sql`${Hacker.school} in ${filter.schools}`);
  }
  if (filter.levelsOfStudy?.length) {
    clauses.push(sql`${Hacker.levelOfStudy} in ${filter.levelsOfStudy}`);
  }
  if (filter.majors?.length) {
    clauses.push(sql`${Hacker.major} in ${filter.majors}`);
  }
  if (filter.racesOrEthnicities?.length) {
    clauses.push(
      sql`${Hacker.raceOrEthnicity}::text in ${filter.racesOrEthnicities}`,
    );
  }
  if (filter.genders?.length) {
    clauses.push(sql`${Hacker.gender}::text in ${filter.genders}`);
  }
  if (filter.countries?.length) {
    clauses.push(sql`${Hacker.country} in ${filter.countries}`);
  }
  if (filter.shirtSizes?.length) {
    clauses.push(sql`${Hacker.shirtSize}::text in ${filter.shirtSizes}`);
  }
  if (filter.graduationYears?.length) {
    clauses.push(
      sql`extract(year from ${Hacker.gradDate}) in ${filter.graduationYears}`,
    );
  }
  if (filter.graduationTerms?.length) {
    // Derived from the month, matching `GRADUATION_TERMS`: Jan–May Spring,
    // Jun–Jul Summer, Aug–Dec Fall.
    clauses.push(
      sql`(case
            when extract(month from ${Hacker.gradDate}) <= 5 then 'Spring'
            when extract(month from ${Hacker.gradDate}) <= 7 then 'Summer'
            else 'Fall'
          end) in ${filter.graduationTerms}`,
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

/**
 * Refuses a status change for a hackathon that is over.
 *
 * Old rosters stay visible and searchable — reading last year's decisions is
 * normal — but mailing someone about a hackathon that finished months ago is
 * almost certainly a misclick on the wrong entry in the picker.
 */
function assertHackathonNotEnded(hackathon: {
  displayName: string;
  endDate: Date;
}) {
  if (hackathon.endDate.getTime() < Date.now()) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `${hackathon.displayName} ended on ${hackathon.endDate.toISOString().slice(0, 10)}. Its roster is read-only.`,
    });
  }
}

/**
 * The audit subjects for a bulk: the hackathon, then everyone who moved.
 *
 * "Bulk changed hacker status · movedCount 187" cannot answer the only question
 * anyone brings to this log weeks later — was *she* in it? Counts describe the
 * action; subjects describe who it happened to, and only subjects are queryable
 * by person.
 */
export function bulkAuditSubjects(
  hackathon: { displayName: string; id: string },
  moved: { attendeeId: string; name: string }[],
) {
  return [
    {
      relation: "primary" as const,
      targetId: hackathon.id,
      targetLabel: hackathon.displayName,
      targetType: "hackathon" as const,
    },
    ...moved.slice(0, BULK_AUDIT_SUBJECT_LIMIT).map((recipient) => ({
      relation: "secondary" as const,
      targetId: recipient.attendeeId,
      targetLabel: recipient.name,
      targetType: "hacker_attendee" as const,
    })),
  ];
}

/**
 * How many applicants a bulk event names individually.
 *
 * High enough to cover any real capacity round in full — the largest hackathon
 * so far is 1448 across every status, and one status bucket is far smaller — and
 * bounded so a runaway selection cannot write an unbounded row.
 */
const BULK_AUDIT_SUBJECT_LIMIT = 500;

/** Audit metadata takes scalars, so each reason worth tracing gets its own. */
function countReason(skips: BulkSkip[], reason: SkipReason) {
  return skips.filter((skip) => skip.reason === reason).length;
}

interface BulkSkip {
  attendeeId: string;
  /**
   * Only set for `duplicate_email`, where the address *is* the explanation.
   *
   * Without it an officer cannot tell one person who applied twice from two
   * people sharing a family address, and those need opposite handling. The
   * caller already receives every sending recipient's email at the same tier,
   * so this reveals nothing new.
   */
  email?: string;
  name: string;
  reason: SkipReason;
}

export const hackerRouter = createTRPCRouter({
  /**
   * Officer-only. The hackathons the roster's picker offers.
   *
   * Ordered by how close the start date is to now, so the default selection is
   * the hackathon an officer is most likely working on — the one about to
   * happen, or the one that just did. Past hackathons stay in the list because
   * looking at last year's roster is normal; `endedAt` lets the screen show
   * them read-only rather than hiding them.
   */
  listHackathonOptions: permProcedure.query(async ({ ctx }) => {
    assertCanManagePlatformConfig(ctx.session.permissions);

    const rows = await db
      .select({
        displayName: Hackathon.displayName,
        endDate: Hackathon.endDate,
        id: Hackathon.id,
        startDate: Hackathon.startDate,
      })
      .from(Hackathon)
      /*
        Upcoming first, soonest at the top; then past ones, most recent first.

        Plain proximity was wrong in the one case that matters: a hackathon that
        ended three weeks ago is "closer" than one starting in two months, so the
        screen opened on a finished event with every action greyed out. Triage
        work is always about the one coming up.

        Both groups sort by distance ascending, which reads correctly in each —
        soonest among the upcoming, most recent among the past — so the furthest
        thing in either direction ends up at the bottom.
      */
      .orderBy(
        sql`case when ${Hackathon.startDate} >= now() then 0 else 1 end`,
        sql`abs(extract(epoch from (${Hackathon.startDate} - now())))`,
      );

    const now = Date.now();
    return {
      hackathons: rows.map((row) => ({
        ...row,
        // Past its end date: still readable, but nothing should be mailed for
        // a hackathon that is over.
        hasEnded: row.endDate.getTime() < now,
      })),
    };
  }),

  /**
   * Officer-only. The distinct values the filters offer, for this hackathon.
   *
   * Read from the applicants who actually exist rather than from the full
   * school enum — offering five thousand universities when eleven appear in
   * the data makes the filter useless.
   */
  filterOptions: permProcedure
    .input(hackerFilterOptionsSchema)
    .query(async ({ ctx, input }) => {
      assertCanManagePlatformConfig(ctx.session.permissions);

      // DISTINCT at the database. Without it this moved every attendee row —
      // 1448 on the largest hackathon today — to build a list of about a dozen
      // schools, and it re-runs on every roster mount and hackathon switch.
      const rows = await db
        .selectDistinct({
          country: Hacker.country,
          gender: Hacker.gender,
          gradYear: sql<number>`extract(year from ${Hacker.gradDate})::int`,
          levelOfStudy: Hacker.levelOfStudy,
          major: Hacker.major,
          raceOrEthnicity: Hacker.raceOrEthnicity,
          school: Hacker.school,
          shirtSize: Hacker.shirtSize,
        })
        .from(HackerAttendee)
        .innerJoin(Hacker, eq(Hacker.id, HackerAttendee.hackerId))
        .where(eq(HackerAttendee.hackathonId, input.hackathonId));

      const distinct = (values: string[]) =>
        [...new Set(values)].sort((left, right) => left.localeCompare(right));

      // Only values this hackathon's applicants actually have. Offering the
      // full enum would list a hundred majors nobody applied with, and an
      // officer picking one gets an empty roster and no explanation.
      return {
        countries: distinct(rows.map((row) => row.country)),
        genders: distinct(rows.map((row) => row.gender)),
        graduationYears: [...new Set(rows.map((row) => row.gradYear))].sort(
          (left, right) => left - right,
        ),
        levelsOfStudy: distinct(rows.map((row) => row.levelOfStudy)),
        majors: distinct(rows.map((row) => row.major)),
        racesOrEthnicities: distinct(rows.map((row) => row.raceOrEthnicity)),
        schools: distinct(rows.map((row) => row.school)),
        shirtSizes: distinct(rows.map((row) => row.shirtSize)),
      };
    }),

  /**
   * Officer-only. One applicant in full.
   *
   * A hacker record is a superset of a member's — everything a member has,
   * plus what MLH requires and what the hackathon needs — so the detail panel
   * reads the whole row rather than the handful of columns the table shows.
   * Kept separate from `listForHackathon` so the roster does not carry every
   * applicant's dietary restrictions and resume link over the wire.
   */
  get: permProcedure
    .input(z.object({ attendeeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      assertCanManagePlatformConfig(ctx.session.permissions);

      const [row] = await db
        .select({
          age: Hacker.age,
          attendeeId: HackerAttendee.id,
          blacklistReason: HackerAttendee.blacklistReason,
          blacklistedAt: HackerAttendee.blacklistedAt,
          country: Hacker.country,
          discordUser: Hacker.discordUser,
          // The Discord account behind the application, so an organiser can
          // reach someone whose email bounced. `User.discordUserId` is the
          // stable snowflake; `Hacker.discordUser` is the handle they typed and
          // can be stale or wrong.
          discordUserId: User.discordUserId,
          email: Hacker.email,
          firstName: Hacker.firstName,
          foodAllergies: Hacker.foodAllergies,
          githubProfileUrl: Hacker.githubProfileUrl,
          gradDate: Hacker.gradDate,
          isFirstTime: Hacker.isFirstTime,
          lastName: Hacker.lastName,
          levelOfStudy: Hacker.levelOfStudy,
          linkedinProfileUrl: Hacker.linkedinProfileUrl,
          major: Hacker.major,
          phoneNumber: Hacker.phoneNumber,
          points: HackerAttendee.points,
          raceOrEthnicity: Hacker.raceOrEthnicity,
          resumeUrl: Hacker.resumeUrl,
          school: Hacker.school,
          sendError: EmailSend.safeError,
          sendStatus: EmailSend.status,
          shirtSize: Hacker.shirtSize,
          status: HackerAttendee.status,
          timeApplied: HackerAttendee.timeApplied,
          timeConfirmed: HackerAttendee.timeConfirmed,
          websiteUrl: Hacker.websiteUrl,
        })
        .from(HackerAttendee)
        .innerJoin(Hacker, eq(Hacker.id, HackerAttendee.hackerId))
        // Left, not inner: an application can outlive the account that made it.
        .leftJoin(User, eq(User.id, Hacker.userId))
        .leftJoin(EmailSend, eq(EmailSend.id, HackerAttendee.lastStatusSendId))
        .where(eq(HackerAttendee.id, input.attendeeId))
        .limit(1);

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Applicant not found.",
        });
      }

      return {
        ...row,
        blacklisted: row.blacklistedAt !== null,
        deliveryFailed: row.sendStatus === "failed",
        name: `${row.firstName} ${row.lastName}`.trim(),
      };
    }),

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
      assertHackathonNotEnded(hackathon);
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
            hackerUserId: Hacker.userId,
            hackathonId: HackerAttendee.hackathonId,
            lastName: Hacker.lastName,
            status: HackerAttendee.status,
          })
          .from(HackerAttendee)
          .innerJoin(Hacker, eq(Hacker.id, HackerAttendee.hackerId))
          .where(eq(HackerAttendee.id, input.attendeeId))
          .for("update", { of: HackerAttendee })
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
              userId: attendee.hackerUserId,
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

        return {
          sendId,
          status: input.status,
          withheldCount: withheldByDevelopmentGate(prepared.teamUserIds, [
            {
              attendeeId: input.attendeeId,
              email: attendee.email,
              firstName: attendee.firstName,
              name: `${attendee.firstName} ${attendee.lastName}`.trim(),
              status: input.status,
              userId: attendee.hackerUserId,
            },
          ]),
        };
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
      const hackathon = await requireHackathon(input.hackathonId);
      assertHackathonNotEnded(hackathon);
      await assertHackathonReady(db, input.hackathonId);

      // Runs the *whole* preparation and throws the result away.
      //
      // Checking the gates individually was not enough: `assertHackathonReady`
      // only counts configured rows, while `prepareStatusMail` also resolves
      // the template and its published revision. A hackathon with all six
      // statuses set but an archived template, or one whose template has no
      // published version, previewed "Send 300 emails" and then died on
      // confirm — the exact failure the preview exists to prevent. Compiling
      // twice costs one template render; being wrong costs an officer's
      // confidence in the preview.
      await prepareStatusMail({ hackathon, status: input.status });

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
      assertHackathonNotEnded(hackathon);
      await assertHackathonReady(db, input.hackathonId);
      const prepared = await prepareStatusMail({
        hackathon,
        status: input.status,
      });

      return db.transaction(async (tx) => {
        const { sending, skipped } = await resolveBulkTargets(tx, input, true);

        if (sending.length === 0) {
          return { movedCount: 0, sendId: null, skipped, withheldCount: 0 };
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
              /*
                An aggregate, for spotting how often this happens. It names
                nobody — the event's subject is the hackathon, not a person. What
                actually answers "why was I never told?" weeks later is that a
                skipped applicant is simply absent from the update below, so she
                keeps her previous status — still sitting at Applied on the
                roster beside someone accepted at the same address. Not a null
                `lastStatusSendId`: she keeps whatever she already had, which is
                set if any earlier transition mailed her.
              */
              skippedDuplicateEmail: countReason(skipped, "duplicate_email"),
              status: input.status,
              // Stated when the subject list below is partial, so nobody reads
              // a truncated list as the whole bulk.
              subjectsTruncated: sending.length > BULK_AUDIT_SUBJECT_LIMIT,
              withheldCount: withheldByDevelopmentGate(
                prepared.teamUserIds,
                sending,
              ),
            },
            subjects: bulkAuditSubjects(
              { displayName: hackathon.displayName, id: input.hackathonId },
              sending,
            ),
          },
          tx,
        );

        return {
          movedCount: sending.length,
          sendId,
          skipped,
          // Surfaced so the officer is told when a development run mails fewer
          // people than it moved, instead of reporting a clean success and
          // sending nothing.
          withheldCount: withheldByDevelopmentGate(
            prepared.teamUserIds,
            sending,
          ),
        };
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
          .for("update", { of: HackerAttendee })
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
      timeApplied: HackerAttendee.timeApplied,
      userId: Hacker.userId,
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

  // `of` matters: without it Postgres takes the lock on every table in the
  // join, so a bulk of two thousand would hold row locks on two thousand
  // `Hacker` rows for the life of the transaction — blocking those people from
  // editing their own profiles in the club app until the officer commits.
  const rows = await (lock ? base.for("update", { of: HackerAttendee }) : base);

  const found = new Map(rows.map((row) => [row.attendeeId, row]));
  const sending: StatusMailRecipient[] = [];
  const skipped: BulkSkip[] = [];
  /**
   * Addresses already claimed by an earlier applicant in this selection.
   *
   * `Hacker.email` is not unique, so two attendee rows in one hackathon can
   * share an address. `EmailSendRecipient` is unique on
   * `(sendId, normalizedEmail)`, so only one of them could ever be mailed —
   * and collapsing silently meant the second person moved to `accepted`, was
   * never told, and never appeared in the Delivery pane either, because the
   * send they pointed at had succeeded.
   *
   * Reported instead. Two applicants sharing an address inside one hackathon is
   * itself worth an officer's attention.
   */
  const claimedEmails = new Set<string>();

  /*
    Ordered by when they applied, then by id.

    Which of a same-address pair is mailed has to be *stable*. Iterating the
    client's array meant shift-selecting rows 1-50 accepted Alice, while
    clicking Bob first and then shift-selecting the same 50 accepted Bob — an
    identical visible selection choosing a different person, with nothing on
    screen to account for it.

    Note that `timeApplied` is `defaultNow()`, so everyone created by one import
    shares a timestamp and the id tiebreak decides. That is arbitrary, and it is
    meant to be: the guarantee is only that repeating the same bulk picks the
    same person, not that the choice is fair.

    Deduplicated as well: a client can send the same id twice, and each
    duplicate would otherwise become a second recipient row and abort the whole
    bulk on the `(sendId, normalizedEmail)` unique constraint.
  */
  const ordered = [...new Set(input.attendeeIds)].sort((left, right) => {
    const leftRow = found.get(left);
    const rightRow = found.get(right);
    if (!leftRow || !rightRow) return leftRow ? -1 : rightRow ? 1 : 0;
    const byTime =
      leftRow.timeApplied.getTime() - rightRow.timeApplied.getTime();
    // Ties broken by id. Two applications can share a timestamp — the fixtures
    // do, and so does any pair created by the same import — and without this the
    // sort is stable on the input array, which puts the officer's click order
    // back in charge of who gets mailed.
    return byTime === 0 ? left.localeCompare(right) : byTime;
  });
  for (const attendeeId of ordered) {
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
    const normalizedEmail = row.email.trim().toLowerCase();
    if (claimedEmails.has(normalizedEmail)) {
      skipped.push({
        attendeeId,
        email: row.email,
        name,
        reason: "duplicate_email",
      });
      continue;
    }
    claimedEmails.add(normalizedEmail);
    sending.push({
      attendeeId,
      email: row.email,
      firstName: row.firstName,
      name,
      status: input.status,
      userId: row.userId,
    });
  }

  return { sending, skipped };
}
