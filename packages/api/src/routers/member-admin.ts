import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { SQL } from "@forge/db";
import type { SelectMember } from "@forge/db/schemas/knight-hacks";
import type { AdminMemberListInput } from "@forge/validators";
import { and, desc, eq, gte, inArray, lte, sql } from "@forge/db";
import { db } from "@forge/db/client";
import {
  DuesPayment,
  FormResponse,
  Member,
} from "@forge/db/schemas/knight-hacks";
import { logger, permissions } from "@forge/utils";
import {
  adminMemberDeleteSchema,
  adminMemberDuesStatusSchema,
  adminMemberIdSchema,
  adminMemberListSchema,
  adminMemberMassDuesInvalidationSchema,
  adminMemberUpdateSchema,
  formatDuesAmount,
  graduationTermYearFromDate,
  MEMBER_DUES_PRICE_CENTS,
  MEMBER_SIGNUP_FORM_ID,
  memberUpdateSchema,
} from "@forge/validators";

import { permProcedure } from "../trpc";
import {
  buildDuesStatus,
  getDuesPaymentIdsToInvalidate,
} from "../utils/dues/status";
import {
  escapeCsvCell,
  rankAdminMemberCandidates,
} from "../utils/member/admin";
import { isUniqueViolation } from "../utils/member/profile";
import { updateMemberProfile } from "../utils/member/update";
import { MAX_PROFILE_PICTURE_DATA_URL_LENGTH } from "../utils/profile-picture/security";
import {
  getProfilePictureDownloadUrlForUser,
  removeProfilePictureObjectsForUser,
  saveMemberProfilePictureForUser,
  uploadProfilePictureForUser,
} from "../utils/profile-picture/storage";
import { MAX_RESUME_DATA_URL_LENGTH } from "../utils/resume/security";
import {
  getMemberResumeDownloadUrlForUser,
  removeUnreferencedResumeObjectsForUser,
  saveMemberResumeForUser,
  uploadResumeForUser,
} from "../utils/resume/storage";

const readMemberPermissions = ["READ_MEMBERS", "EDIT_MEMBERS"] as const;
const editMemberPermissions = ["EDIT_MEMBERS"] as const;

export interface AdminMemberRecord {
  about: string | null;
  age: number;
  company: string | null;
  dateCreated: string;
  discordUser: string;
  dob: string;
  email: string;
  firstName: string;
  gender: string;
  githubProfileUrl: string | null;
  gradDate: string;
  guildProfileVisible: boolean;
  id: string;
  lastName: string;
  levelOfStudy: string;
  linkedinProfileUrl: string | null;
  major: string;
  phoneNumber: string | null;
  points: number;
  profilePictureUrl: string | null;
  raceOrEthnicity: string;
  resumeUrl: string | null;
  school: string;
  shirtSize: string;
  tagline: string | null;
  timeCreated: string;
  userId: string;
  websiteUrl: string | null;
}

export interface AdminMemberFilterOptions {
  companies: string[];
  genders: string[];
  graduationYears: number[];
  guildVisibilities: string[];
  levelsOfStudy: string[];
  majors: string[];
  racesOrEthnicities: string[];
  schools: string[];
}

const adminProfilePictureInputSchema = adminMemberIdSchema.extend({
  fileContent: z.string().max(MAX_PROFILE_PICTURE_DATA_URL_LENGTH),
  fileName: z.string().trim().min(1).max(255),
});
const adminResumeInputSchema = adminMemberIdSchema.extend({
  fileContent: z.string().max(MAX_RESUME_DATA_URL_LENGTH),
  fileName: z.string().trim().min(1).max(255),
});

function assertCanReadMembers(
  ctx: Parameters<typeof permissions.controlPerms.or>[1],
) {
  permissions.controlPerms.or(readMemberPermissions, ctx);
}

function assertCanEditMembers(
  ctx: Parameters<typeof permissions.controlPerms.or>[1],
) {
  permissions.controlPerms.or(editMemberPermissions, ctx);
}

async function auditAdminMutation({
  color,
  message,
  title,
  userId,
}: {
  color: "success_green" | "uhoh_red";
  message: string;
  title: string;
  userId: string;
}) {
  try {
    const discord = await import("@forge/utils/discord");
    await discord.log({ color, message, title, userId });
  } catch (error) {
    logger.warn(`Unable to deliver Blade audit log for ${title}:`, error);
  }
}

function structuredMemberConditions(input: AdminMemberListInput) {
  const conditions: SQL[] = [];

  if (input.schools.length > 0) {
    conditions.push(
      inArray(Member.school, input.schools as SelectMember["school"][]),
    );
  }
  if (input.majors.length > 0) {
    conditions.push(inArray(Member.major, input.majors));
  }
  if (input.levelsOfStudy.length > 0) {
    conditions.push(inArray(Member.levelOfStudy, input.levelsOfStudy));
  }
  if (input.graduationYears.length > 0) {
    conditions.push(
      inArray(
        sql<number>`extract(year from ${Member.gradDate})::int`,
        input.graduationYears,
      ),
    );
  }
  if (input.companies.length > 0) {
    conditions.push(inArray(Member.company, input.companies));
  }
  if (input.genders.length > 0) {
    conditions.push(inArray(Member.gender, input.genders));
  }
  if (input.racesOrEthnicities.length > 0) {
    conditions.push(inArray(Member.raceOrEthnicity, input.racesOrEthnicities));
  }
  if (input.guildVisibilities.length === 1) {
    conditions.push(
      eq(Member.guildProfileVisible, input.guildVisibilities[0] === "public"),
    );
  }
  if (input.joinedFrom) {
    conditions.push(gte(Member.dateCreated, input.joinedFrom));
  }
  if (input.joinedTo) {
    conditions.push(lte(Member.dateCreated, input.joinedTo));
  }

  return conditions.length === 0 ? undefined : and(...conditions);
}

type CandidateRow = Awaited<ReturnType<typeof getCandidateRows>>[number];

async function getCandidateRows(input: AdminMemberListInput) {
  return await db
    .select({
      company: Member.company,
      dateCreated: Member.dateCreated,
      discordUser: Member.discordUser,
      email: Member.email,
      firstName: Member.firstName,
      id: Member.id,
      lastName: Member.lastName,
      school: Member.school,
      timeCreated: Member.timeCreated,
    })
    .from(Member)
    .where(structuredMemberConditions(input));
}

async function getDuesRows(memberIds: string[]) {
  if (memberIds.length === 0) return [];

  return await db
    .select({
      active: DuesPayment.active,
      amount: DuesPayment.amount,
      id: DuesPayment.id,
      memberId: DuesPayment.memberId,
      paymentDate: DuesPayment.paymentDate,
      stripePaymentIntentId: DuesPayment.stripePaymentIntentId,
      year: DuesPayment.year,
    })
    .from(DuesPayment)
    .where(inArray(DuesPayment.memberId, memberIds))
    .orderBy(desc(DuesPayment.paymentDate));
}

function statusMapForCandidates(
  candidates: CandidateRow[],
  duesRows: Awaited<ReturnType<typeof getDuesRows>>,
) {
  const rowsByMember = new Map<string, typeof duesRows>();
  for (const row of duesRows) {
    const rows = rowsByMember.get(row.memberId) ?? [];
    rows.push(row);
    rowsByMember.set(row.memberId, rows);
  }

  return new Map(
    candidates.map((candidate) => [
      candidate.id,
      buildDuesStatus({ duesRows: rowsByMember.get(candidate.id) ?? [] }),
    ]),
  );
}

function compareCandidates(
  left: CandidateRow,
  right: CandidateRow,
  input: AdminMemberListInput,
) {
  const value =
    input.sortField === "name"
      ? left.firstName.localeCompare(right.firstName) ||
        left.lastName.localeCompare(right.lastName)
      : input.sortField === "discord"
        ? left.discordUser.localeCompare(right.discordUser)
        : `${left.dateCreated} ${left.timeCreated}`.localeCompare(
            `${right.dateCreated} ${right.timeCreated}`,
          );

  const directed = input.sortDirection === "asc" ? value : -value;
  return directed || left.id.localeCompare(right.id);
}

async function getOrderedCandidates(input: AdminMemberListInput) {
  const candidates = await getCandidateRows(input);
  const duesRows = await getDuesRows(
    candidates.map((candidate) => candidate.id),
  );
  const duesStatuses = statusMapForCandidates(candidates, duesRows);
  const duesFiltered =
    input.duesStatuses.length === 0 || input.duesStatuses.length === 2
      ? candidates
      : candidates.filter((candidate) =>
          input.duesStatuses.includes(
            duesStatuses.get(candidate.id)?.state ?? "unpaid",
          ),
        );
  const ranked = rankAdminMemberCandidates(duesFiltered, input.query);

  ranked.sort(
    (left, right) =>
      (input.query ? right.score - left.score : 0) ||
      compareCandidates(left.candidate, right.candidate, input),
  );

  return {
    candidates: ranked.map(({ candidate }) => candidate),
    duesStatuses,
  };
}

async function getMembersInOrder(memberIds: string[]) {
  if (memberIds.length === 0) return [];
  const members = await db.query.Member.findMany({
    where: inArray(Member.id, memberIds),
  });
  const byId = new Map(members.map((member) => [member.id, member]));
  return memberIds.flatMap((memberId) => {
    const member = byId.get(memberId);
    return member ? [member] : [];
  });
}

async function getFilterOptions(): Promise<AdminMemberFilterOptions> {
  const rows = await db
    .select({
      company: Member.company,
      gender: Member.gender,
      gradDate: Member.gradDate,
      guildProfileVisible: Member.guildProfileVisible,
      levelOfStudy: Member.levelOfStudy,
      major: Member.major,
      raceOrEthnicity: Member.raceOrEthnicity,
      school: Member.school,
    })
    .from(Member);

  const distinct = (values: readonly string[]): string[] =>
    [...new Set(values)].sort((left, right) => left.localeCompare(right));

  return {
    companies: distinct(
      rows.flatMap((row) => (row.company ? [row.company] : [])),
    ),
    genders: distinct(rows.map((row) => row.gender)),
    graduationYears: [
      ...new Set(rows.map((row) => Number(row.gradDate.slice(0, 4)))),
    ].sort((left, right) => right - left),
    guildVisibilities: distinct(
      rows.map((row) => (row.guildProfileVisible ? "public" : "private")),
    ),
    levelsOfStudy: distinct(rows.map((row) => row.levelOfStudy)),
    majors: distinct(rows.map((row) => row.major)),
    racesOrEthnicities: distinct(rows.map((row) => row.raceOrEthnicity)),
    schools: distinct(rows.map((row) => row.school)),
  };
}

function toListItem(
  member: Awaited<ReturnType<typeof getMembersInOrder>>[number],
  duesStatus: ReturnType<typeof buildDuesStatus>,
): {
  company: string | null;
  dateCreated: string;
  discordUser: string;
  duesStatus: { paid: boolean; state: "paid" | "unpaid" };
  email: string;
  firstName: string;
  graduation: ReturnType<typeof graduationTermYearFromDate>;
  id: string;
  lastName: string;
  school: string;
} {
  return {
    company: member.company,
    dateCreated: member.dateCreated,
    discordUser: member.discordUser,
    duesStatus: { paid: duesStatus.paid, state: duesStatus.state },
    email: member.email,
    firstName: member.firstName,
    graduation: graduationTermYearFromDate(member.gradDate),
    id: member.id,
    lastName: member.lastName,
    school: member.school,
  };
}

function toAdminMemberRecord(
  member: Awaited<ReturnType<typeof findMemberOrThrow>>,
): AdminMemberRecord {
  return member;
}

const csvColumns = [
  "Member ID",
  "First name",
  "Last name",
  "Discord username",
  "Email",
  "Phone number",
  "Date of birth",
  "Age",
  "School",
  "Level of study",
  "Major",
  "Gender",
  "Race or ethnicity",
  "Shirt size",
  "Graduation term",
  "Graduation year",
  "Company",
  "Points",
  "Guild profile visible",
  "Tagline",
  "About",
  "GitHub URL",
  "LinkedIn URL",
  "Website URL",
  "Has profile picture",
  "Has resume",
  "Joined date",
  "Joined time",
  "Dues status",
  "Dues academic year",
  "Dues paid date",
  "Dues amount",
] as const;

function memberCsvRow(
  member: Awaited<ReturnType<typeof getMembersInOrder>>[number],
  duesStatus: ReturnType<typeof buildDuesStatus>,
) {
  const graduation = graduationTermYearFromDate(member.gradDate);
  return [
    member.id,
    member.firstName,
    member.lastName,
    member.discordUser,
    member.email,
    member.phoneNumber,
    member.dob,
    member.age,
    member.school,
    member.levelOfStudy,
    member.major,
    member.gender,
    member.raceOrEthnicity,
    member.shirtSize,
    graduation.gradTerm,
    graduation.gradYear,
    member.company,
    member.points,
    member.guildProfileVisible ? "Yes" : "No",
    member.tagline,
    member.about,
    member.githubProfileUrl,
    member.linkedinProfileUrl,
    member.websiteUrl,
    member.profilePictureUrl ? "Yes" : "No",
    member.resumeUrl ? "Yes" : "No",
    member.dateCreated,
    member.timeCreated,
    duesStatus.paid ? "Paid" : "Unpaid",
    duesStatus.paid ? duesStatus.paymentAcademicYear.shortLabel : "",
    duesStatus.paidAt,
    duesStatus.amountPaid == null
      ? ""
      : formatDuesAmount(duesStatus.amountPaid),
  ];
}

async function findMemberOrThrow(memberId: string) {
  const member = await db.query.Member.findFirst({
    where: eq(Member.id, memberId),
  });
  if (!member) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Member not found." });
  }
  return member;
}

export const adminMemberProcedures = {
  getAdminMembers: permProcedure
    .input(adminMemberListSchema)
    .query(async ({ ctx, input }) => {
      assertCanReadMembers(ctx);
      const { candidates, duesStatuses } = await getOrderedCandidates(input);
      const totalCount = candidates.length;
      const pageCount = Math.max(1, Math.ceil(totalCount / input.pageSize));
      const page = Math.min(input.page, pageCount);
      const pageIds = candidates
        .slice((page - 1) * input.pageSize, page * input.pageSize)
        .map((candidate) => candidate.id);
      const members = await getMembersInOrder(pageIds);

      return {
        filterOptions: await getFilterOptions(),
        members: members.map((member) =>
          toListItem(
            member,
            duesStatuses.get(member.id) ?? buildDuesStatus({ duesRows: [] }),
          ),
        ),
        pagination: { page, pageCount, pageSize: input.pageSize, totalCount },
      };
    }),

  getAdminMember: permProcedure
    .input(adminMemberIdSchema)
    .query(async ({ ctx, input }) => {
      assertCanReadMembers(ctx);
      const member = await findMemberOrThrow(input.memberId);
      const duesRows = await getDuesRows([member.id]);
      const [profilePicture, resume] = await Promise.all([
        getProfilePictureDownloadUrlForUser(member.userId),
        getMemberResumeDownloadUrlForUser(member.userId),
      ]);

      return {
        member: toAdminMemberRecord(member),
        duesStatus: buildDuesStatus({ duesRows }),
        profilePictureUrl: profilePicture.url,
        resumeUrl: resume.url,
      };
    }),

  exportAdminMembers: permProcedure
    .input(adminMemberListSchema)
    .query(async ({ ctx, input }) => {
      assertCanReadMembers(ctx);
      const { candidates, duesStatuses } = await getOrderedCandidates(input);
      const members = await getMembersInOrder(
        candidates.map((candidate) => candidate.id),
      );
      const lines = [
        csvColumns.map(escapeCsvCell).join(","),
        ...members.map((member) =>
          memberCsvRow(
            member,
            duesStatuses.get(member.id) ?? buildDuesStatus({ duesRows: [] }),
          )
            .map(escapeCsvCell)
            .join(","),
        ),
      ];

      return {
        content: `${lines.join("\r\n")}\r\n`,
        fileName: `members-${new Date().toISOString().slice(0, 10)}.csv`,
      };
    }),

  updateAdminMember: permProcedure
    .input(adminMemberUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanEditMembers(ctx);
      try {
        const member = await findMemberOrThrow(input.memberId);
        const normalizedProfile = memberUpdateSchema.parse({
          ...input.profile,
          profilePictureUrl: member.profilePictureUrl ?? "",
          resumeUrl: member.resumeUrl ?? "",
        });
        const updated = await updateMemberProfile({
          database: db,
          input: normalizedProfile,
          memberId: member.id,
          points: input.points,
          userId: member.userId,
        });
        await auditAdminMutation({
          color: "success_green",
          message: `Updated member ${member.id}.`,
          title: "Admin Member Updated",
          userId: ctx.session.user.discordUserId,
        });
        return { memberId: updated.id };
      } catch (error) {
        await auditAdminMutation({
          color: "uhoh_red",
          message: `Failed to update member ${input.memberId}.`,
          title: "Admin Member Update Failed",
          userId: ctx.session.user.discordUserId,
        });
        throw error;
      }
    }),

  deleteAdminMember: permProcedure
    .input(adminMemberDeleteSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanEditMembers(ctx);
      try {
        const member = await findMemberOrThrow(input.memberId);
        await db.transaction(async (tx) => {
          await tx
            .delete(FormResponse)
            .where(
              and(
                eq(FormResponse.userId, member.userId),
                eq(FormResponse.form, MEMBER_SIGNUP_FORM_ID),
              ),
            );
          await tx.delete(Member).where(eq(Member.id, member.id));
        });
        await Promise.all([
          removeProfilePictureObjectsForUser(member.userId),
          removeUnreferencedResumeObjectsForUser(member.userId),
        ]);
        await auditAdminMutation({
          color: "uhoh_red",
          message: `Deleted Member profile ${member.id}.`,
          title: "Admin Member Deleted",
          userId: ctx.session.user.discordUserId,
        });
        return { deleted: true };
      } catch (error) {
        await auditAdminMutation({
          color: "uhoh_red",
          message: `Failed to delete Member profile ${input.memberId}.`,
          title: "Admin Member Delete Failed",
          userId: ctx.session.user.discordUserId,
        });
        throw error;
      }
    }),

  setAdminDuesStatus: permProcedure
    .input(adminMemberDuesStatusSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanEditMembers(ctx);
      try {
        await db.transaction(async (tx) => {
          const member = await tx.query.Member.findFirst({
            where: eq(Member.id, input.memberId),
            columns: { id: true },
          });
          if (!member) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Member not found.",
            });
          }
          const duesRows = await tx
            .select({
              active: DuesPayment.active,
              amount: DuesPayment.amount,
              id: DuesPayment.id,
              paymentDate: DuesPayment.paymentDate,
              stripePaymentIntentId: DuesPayment.stripePaymentIntentId,
              year: DuesPayment.year,
            })
            .from(DuesPayment)
            .where(eq(DuesPayment.memberId, member.id))
            .orderBy(desc(DuesPayment.paymentDate));
          const status = buildDuesStatus({ duesRows });

          if (input.paid) {
            if (status.paid) {
              throw new TRPCError({
                code: "CONFLICT",
                message: "Member dues are already paid.",
              });
            }
            const existingPayable = duesRows.find(
              (row) => row.year === status.payableAcademicYear.startYear,
            );
            if (existingPayable) {
              const [reactivated] = await tx
                .update(DuesPayment)
                .set({ active: true })
                .where(
                  and(
                    eq(DuesPayment.id, existingPayable.id),
                    eq(DuesPayment.active, false),
                  ),
                )
                .returning();
              if (!reactivated) throw new TRPCError({ code: "CONFLICT" });
              return reactivated;
            }
            const [created] = await tx
              .insert(DuesPayment)
              .values({
                active: true,
                amount: MEMBER_DUES_PRICE_CENTS,
                memberId: member.id,
                paymentDate: new Date(),
                stripePaymentIntentId: null,
                year: status.payableAcademicYear.startYear,
              })
              .returning();
            if (!created) throw new TRPCError({ code: "CONFLICT" });
            return created;
          }

          const paymentIds = getDuesPaymentIdsToInvalidate({ duesRows });
          if (paymentIds.length === 0) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Member dues are already unpaid.",
            });
          }
          const revoked = await tx
            .update(DuesPayment)
            .set({ active: false })
            .where(
              and(
                inArray(DuesPayment.id, paymentIds),
                eq(DuesPayment.active, true),
              ),
            )
            .returning();
          if (revoked.length === 0) {
            throw new TRPCError({ code: "CONFLICT" });
          }
          return revoked;
        });

        await auditAdminMutation({
          color: input.paid ? "success_green" : "uhoh_red",
          message: `${input.paid ? "Granted" : "Revoked"} dues for member ${input.memberId}.`,
          title: input.paid ? "Admin Dues Granted" : "Admin Dues Revoked",
          userId: ctx.session.user.discordUserId,
        });
        return { memberId: input.memberId, paid: input.paid };
      } catch (error) {
        const changedConcurrently = isUniqueViolation(error);
        await auditAdminMutation({
          color: "uhoh_red",
          message: `Failed to change dues for member ${input.memberId}.`,
          title: "Admin Dues Change Failed",
          userId: ctx.session.user.discordUserId,
        });
        if (changedConcurrently) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Dues status changed before this request completed.",
          });
        }
        throw error;
      }
    }),

  invalidateEffectiveDues: permProcedure
    .input(adminMemberMassDuesInvalidationSchema)
    .mutation(async ({ ctx }) => {
      permissions.controlPerms.or(["IS_OFFICER"], ctx);
      try {
        const affected = await db.transaction(async (tx) => {
          const rows = await tx
            .select({
              active: DuesPayment.active,
              amount: DuesPayment.amount,
              id: DuesPayment.id,
              memberId: DuesPayment.memberId,
              paymentDate: DuesPayment.paymentDate,
              stripePaymentIntentId: DuesPayment.stripePaymentIntentId,
              year: DuesPayment.year,
            })
            .from(DuesPayment)
            .orderBy(desc(DuesPayment.paymentDate));
          const byMember = new Map<string, typeof rows>();
          for (const row of rows) {
            const memberRows = byMember.get(row.memberId) ?? [];
            memberRows.push(row);
            byMember.set(row.memberId, memberRows);
          }
          const referenceDate = new Date();
          const effectiveIds = [...byMember.values()].flatMap((memberRows) =>
            getDuesPaymentIdsToInvalidate({
              duesRows: memberRows,
              referenceDate,
            }),
          );
          if (effectiveIds.length === 0) return 0;
          const updated = await tx
            .update(DuesPayment)
            .set({ active: false })
            .where(inArray(DuesPayment.id, effectiveIds))
            .returning({ memberId: DuesPayment.memberId });
          return new Set(updated.map((row) => row.memberId)).size;
        });
        await auditAdminMutation({
          color: "uhoh_red",
          message: `Invalidated effective dues for ${affected} members.`,
          title: "All Effective Dues Invalidated",
          userId: ctx.session.user.discordUserId,
        });
        return { affected };
      } catch (error) {
        await auditAdminMutation({
          color: "uhoh_red",
          message: "Failed to invalidate effective member dues.",
          title: "Effective Dues Invalidation Failed",
          userId: ctx.session.user.discordUserId,
        });
        throw error;
      }
    }),

  uploadAdminProfilePicture: permProcedure
    .input(adminProfilePictureInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanEditMembers(ctx);
      let targetUserId: string | null = null;
      let previousObjectName: string | null = null;
      try {
        const member = await findMemberOrThrow(input.memberId);
        targetUserId = member.userId;
        previousObjectName = member.profilePictureUrl;
        const objectName = await uploadProfilePictureForUser({
          fileContent: input.fileContent,
          userId: member.userId,
        });
        await saveMemberProfilePictureForUser({
          database: db,
          profilePictureUrl: objectName,
          userId: member.userId,
        });
        await removeProfilePictureObjectsForUser(member.userId, [objectName]);
        await auditAdminMutation({
          color: "success_green",
          message: `Replaced the profile picture for member ${member.id}.`,
          title: "Admin Member Profile Picture Replaced",
          userId: ctx.session.user.discordUserId,
        });
        return { objectName };
      } catch (error) {
        if (targetUserId) {
          await removeProfilePictureObjectsForUser(
            targetUserId,
            previousObjectName ? [previousObjectName] : [],
          );
        }
        await auditAdminMutation({
          color: "uhoh_red",
          message: `Failed to replace the profile picture for member ${input.memberId}.`,
          title: "Admin Member Profile Picture Replace Failed",
          userId: ctx.session.user.discordUserId,
        });
        throw error;
      }
    }),

  removeAdminProfilePicture: permProcedure
    .input(adminMemberIdSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanEditMembers(ctx);
      try {
        const member = await findMemberOrThrow(input.memberId);
        await saveMemberProfilePictureForUser({
          database: db,
          profilePictureUrl: null,
          userId: member.userId,
        });
        await removeProfilePictureObjectsForUser(member.userId);
        await auditAdminMutation({
          color: "uhoh_red",
          message: `Removed the profile picture for member ${member.id}.`,
          title: "Admin Member Profile Picture Removed",
          userId: ctx.session.user.discordUserId,
        });
        return { removed: true };
      } catch (error) {
        await auditAdminMutation({
          color: "uhoh_red",
          message: `Failed to remove the profile picture for member ${input.memberId}.`,
          title: "Admin Member Profile Picture Remove Failed",
          userId: ctx.session.user.discordUserId,
        });
        throw error;
      }
    }),

  uploadAdminResume: permProcedure
    .input(adminResumeInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanEditMembers(ctx);
      let targetUserId: string | null = null;
      try {
        const member = await findMemberOrThrow(input.memberId);
        targetUserId = member.userId;
        const objectName = await uploadResumeForUser({
          fileContent: input.fileContent,
          userId: member.userId,
        });
        await saveMemberResumeForUser({
          database: db,
          resumeUrl: objectName,
          userId: member.userId,
        });
        await removeUnreferencedResumeObjectsForUser(member.userId);
        await auditAdminMutation({
          color: "success_green",
          message: `Replaced the resume for member ${member.id}.`,
          title: "Admin Member Resume Replaced",
          userId: ctx.session.user.discordUserId,
        });
        return { objectName };
      } catch (error) {
        if (targetUserId) {
          await removeUnreferencedResumeObjectsForUser(targetUserId);
        }
        await auditAdminMutation({
          color: "uhoh_red",
          message: `Failed to replace the resume for member ${input.memberId}.`,
          title: "Admin Member Resume Replace Failed",
          userId: ctx.session.user.discordUserId,
        });
        throw error;
      }
    }),

  removeAdminResume: permProcedure
    .input(adminMemberIdSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanEditMembers(ctx);
      try {
        const member = await findMemberOrThrow(input.memberId);
        await saveMemberResumeForUser({
          database: db,
          resumeUrl: null,
          userId: member.userId,
        });
        await removeUnreferencedResumeObjectsForUser(member.userId);
        await auditAdminMutation({
          color: "uhoh_red",
          message: `Removed the resume for member ${member.id}.`,
          title: "Admin Member Resume Removed",
          userId: ctx.session.user.discordUserId,
        });
        return { removed: true };
      } catch (error) {
        await auditAdminMutation({
          color: "uhoh_red",
          message: `Failed to remove the resume for member ${input.memberId}.`,
          title: "Admin Member Resume Remove Failed",
          userId: ctx.session.user.discordUserId,
        });
        throw error;
      }
    }),
} satisfies TRPCRouterRecord;
