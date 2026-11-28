import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";

import { and, count, desc, eq, ilike, inArray } from "@forge/db";
import { db } from "@forge/db/client";
import { Job, JobApplication } from "@forge/db/schemas/job-board";
import {
  applicationIdInputSchema,
  applicationSaveInputSchema,
  applicationUpdateInputSchema,
  companyViewInputSchema,
  jobIdInputSchema,
  jobSearchInputSchema,
  peopleInProcessInputSchema,
} from "@forge/validators";

import type { CommunityApplication } from "../utils/job-board/community";
import { protectedProcedure } from "../trpc";
import { requireJobBoardMember } from "../utils/job-board/access";
import {
  listApplicationHistory,
  removeApplication,
  saveApplication,
  updateApplication,
} from "../utils/job-board/applications";
import {
  countCommunityApplications,
  listCommunityApplications,
} from "../utils/job-board/community";
import {
  containsPattern,
  jobSearchConditions,
  jobSearchOrder,
  jobSummaryColumns,
  listJobLocations,
  listJobSources,
} from "../utils/job-board/search";

/** A company page is one screen, not a paged list; the largest boards exceed this. */
const COMPANY_VIEW_MAX_LISTINGS = 200;

async function withLocations<Row extends { id: string }>(jobs: Row[]) {
  const locations = await listJobLocations(jobs.map((job) => job.id));
  return jobs.map((job) => ({
    ...job,
    locations: locations.get(job.id) ?? [],
  }));
}

export const jobBoardRouter = {
  /** Explore: filtered, sorted, paged listings. Inactive ones are opt-in. */
  searchJobs: protectedProcedure
    .input(jobSearchInputSchema)
    .query(async ({ ctx, input }) => {
      await requireJobBoardMember(ctx.session.user.id);
      const where = jobSearchConditions(input);

      const [jobs, [totals]] = await Promise.all([
        db
          .select(jobSummaryColumns)
          .from(Job)
          .where(where)
          .orderBy(...jobSearchOrder(input.sort))
          .limit(input.limit)
          .offset((input.page - 1) * input.limit),
        db.select({ total: count() }).from(Job).where(where),
      ]);

      return {
        jobs: await withLocations(jobs),
        limit: input.limit,
        page: input.page,
        total: totals?.total ?? 0,
      };
    }),

  /** One listing, the members in process for it, and the caller's own progress. */
  getJob: protectedProcedure
    .input(jobIdInputSchema)
    .query(async ({ ctx, input }) => {
      const member = await requireJobBoardMember(ctx.session.user.id);
      const [job] = await db
        .select({ ...jobSummaryColumns, description: Job.description })
        .from(Job)
        .where(eq(Job.id, input.jobId))
        .limit(1);
      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "That job does not exist.",
        });
      }

      const [[listing], sources, peopleInProcess, [mine]] = await Promise.all([
        withLocations([job]),
        listJobSources(job.id),
        listCommunityApplications(eq(JobApplication.jobId, job.id)),
        db
          .select({
            id: JobApplication.id,
            interviewLabel: JobApplication.interviewLabel,
            privateNotes: JobApplication.privateNotes,
            round: JobApplication.round,
            stage: JobApplication.stage,
            visibility: JobApplication.visibility,
          })
          .from(JobApplication)
          .where(
            and(
              eq(JobApplication.jobId, job.id),
              eq(JobApplication.memberId, member.id),
            ),
          )
          .limit(1),
      ]);

      return {
        job: { ...job, locations: listing?.locations ?? [], sources },
        myApplication: mine ?? null,
        peopleInProcess,
      };
    }),

  /** A company's listings, each with the members in process for that role. */
  getCompany: protectedProcedure
    .input(companyViewInputSchema)
    .query(async ({ ctx, input }) => {
      await requireJobBoardMember(ctx.session.user.id);
      const jobs = await db
        .select(jobSummaryColumns)
        .from(Job)
        .where(
          and(
            eq(Job.companyKey, input.company),
            input.track ? eq(Job.track, input.track) : undefined,
          ),
        )
        // Open roles first; closed ones stay for the members still tracking them.
        .orderBy(desc(Job.active), ...jobSearchOrder("newest"))
        .limit(COMPANY_VIEW_MAX_LISTINGS);
      const [newest] = jobs;
      if (!newest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No jobs are listed for that company.",
        });
      }

      const jobIds = jobs.map((job) => job.id);
      const [listings, applicants] = await Promise.all([
        withLocations(jobs),
        listCommunityApplications(inArray(JobApplication.jobId, jobIds)),
      ]);
      const applicantsByJob = new Map<string, CommunityApplication[]>();
      for (const applicant of applicants) {
        const group = applicantsByJob.get(applicant.jobId) ?? [];
        group.push(applicant);
        applicantsByJob.set(applicant.jobId, group);
      }

      return {
        companyKey: input.company,
        companyLabel: newest.companyLabel,
        listings: listings.map((listing) => ({
          ...listing,
          peopleInProcess: applicantsByJob.get(listing.id) ?? [],
        })),
      };
    }),

  /** Browse members by company, role and stage to find others in a process. */
  listPeopleInProcess: protectedProcedure
    .input(peopleInProcessInputSchema)
    .query(async ({ ctx, input }) => {
      await requireJobBoardMember(ctx.session.user.id);
      const filter = and(
        input.company ? eq(Job.companyKey, input.company) : undefined,
        input.role ? ilike(Job.title, containsPattern(input.role)) : undefined,
        input.stage ? eq(JobApplication.stage, input.stage) : undefined,
        input.track ? eq(Job.track, input.track) : undefined,
      );

      const [people, total] = await Promise.all([
        listCommunityApplications(filter, {
          limit: input.limit,
          offset: (input.page - 1) * input.limit,
        }),
        countCommunityApplications(filter),
      ]);

      return { limit: input.limit, page: input.page, people, total };
    }),

  /** The caller's own tracker, including private applications and notes. */
  listMyApplications: protectedProcedure.query(async ({ ctx }) => {
    const member = await requireJobBoardMember(ctx.session.user.id);
    const applications = await db
      .select({
        createdAt: JobApplication.createdAt,
        id: JobApplication.id,
        interviewLabel: JobApplication.interviewLabel,
        job: jobSummaryColumns,
        privateNotes: JobApplication.privateNotes,
        round: JobApplication.round,
        stage: JobApplication.stage,
        updatedAt: JobApplication.updatedAt,
        visibility: JobApplication.visibility,
      })
      .from(JobApplication)
      .innerJoin(Job, eq(Job.id, JobApplication.jobId))
      .where(eq(JobApplication.memberId, member.id))
      .orderBy(desc(JobApplication.updatedAt), desc(JobApplication.id));

    return await Promise.all(
      applications.map(async (application) => ({
        ...application,
        history: await listApplicationHistory(db, application.id),
      })),
    );
  }),

  saveApplication: protectedProcedure
    .input(applicationSaveInputSchema)
    .mutation(async ({ ctx, input }) => {
      const member = await requireJobBoardMember(ctx.session.user.id);
      return await db.transaction(
        async (tx) =>
          await saveApplication({ database: tx, input, memberId: member.id }),
      );
    }),

  updateApplication: protectedProcedure
    .input(applicationUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const member = await requireJobBoardMember(ctx.session.user.id);
      return await db.transaction(
        async (tx) =>
          await updateApplication({ database: tx, input, memberId: member.id }),
      );
    }),

  removeApplication: protectedProcedure
    .input(applicationIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      const member = await requireJobBoardMember(ctx.session.user.id);
      await db.transaction(
        async (tx) =>
          await removeApplication({
            actor: ctx.session.user,
            applicationId: input.applicationId,
            database: tx,
            memberId: member.id,
          }),
      );
      return { applicationId: input.applicationId };
    }),
} satisfies TRPCRouterRecord;
