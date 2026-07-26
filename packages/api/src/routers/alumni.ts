import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";

import { and, asc, desc, eq, inArray, isNull, ne, sql } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles, User } from "@forge/db/schemas/auth";
import {
  AlumniBulletinPost,
  Company,
  Employment,
  Event,
  EventAttendee,
  FormResponse,
  FormsSchemas,
  Member,
} from "@forge/db/schemas/knight-hacks";
import { permissions } from "@forge/utils";
import {
  alumniBulletinIdSchema,
  alumniBulletinImageRemoveSchema,
  alumniBulletinImageUploadSchema,
  alumniBulletinPostSchema,
  alumniBulletinUpdateSchema,
  alumniGraduationResolutionSchema,
  alumniReorderBulletinPostsSchema,
  MEMBER_SIGNUP_FORM_ID,
} from "@forge/validators";

import { permProcedure, protectedProcedure } from "../trpc";
import {
  getAlumniBulletinImageUrl,
  removeAlumniBulletinImage,
  uploadAlumniBulletinImage,
} from "../utils/alumni/bulletin-image";
import {
  buildAlumniRecap,
  getAlumniDashboardMode,
  listActiveBulletinPosts,
  listCurrentAlumniOfficers,
} from "../utils/alumni/dashboard";
import {
  PROFILE_PICTURE_BUCKET_NAME,
  resolveProfilePictureObjectName,
} from "../utils/profile-picture/security";
import { profilePictureStorageClient } from "../utils/profile-picture/storage";

const alumniOfficerRoles = [
  "President",
  "Vice President",
  "Secretary",
  "Treasurer",
] as const;

function officerDisplayName(row: {
  firstName: string | null;
  lastName: string | null;
  userName: string | null;
}) {
  const memberName = [row.firstName, row.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (memberName.length > 0) return memberName;
  const userName = row.userName?.trim();
  return userName && userName.length > 0 ? userName : "Knight Hacks officer";
}

function assertCanManageAlumni(
  ctx: Parameters<typeof permissions.controlPerms.or>[1],
) {
  permissions.controlPerms.or(["MANAGE_ALUMNI_DASHBOARD"], ctx);
}

async function getMemberForUser(userId: string) {
  const member = await db.query.Member.findFirst({
    where: eq(Member.userId, userId),
  });
  if (!member) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Create a member profile before opening the alumni dashboard.",
    });
  }
  return member;
}

async function getOfficerProfilePictureUrl({
  profilePictureReference,
  userId,
}: {
  profilePictureReference: string | null;
  userId: string;
}) {
  if (!profilePictureReference) return null;
  const objectName = resolveProfilePictureObjectName(
    profilePictureReference,
    userId,
  );
  if (!objectName) return null;

  try {
    return await profilePictureStorageClient.presignedUrl(
      "GET",
      PROFILE_PICTURE_BUCKET_NAME,
      objectName,
      60 * 60,
    );
  } catch {
    return null;
  }
}

async function getCurrentOfficers() {
  const rows = await db
    .select({
      discordUserId: User.discordUserId,
      firstName: Member.firstName,
      lastName: Member.lastName,
      profilePictureReference: Member.profilePictureUrl,
      roleName: Roles.name,
      userId: User.id,
      userName: User.name,
    })
    .from(Permissions)
    .innerJoin(Roles, eq(Roles.id, Permissions.roleId))
    .innerJoin(User, eq(User.id, Permissions.userId))
    .leftJoin(Member, eq(Member.userId, User.id))
    .where(inArray(Roles.name, [...alumniOfficerRoles]))
    .orderBy(asc(Roles.name), asc(Member.firstName), asc(Member.lastName));

  const assignments = await Promise.all(
    rows.map(async (row) => ({
      discordUserId: row.discordUserId,
      name: officerDisplayName(row),
      profilePictureUrl: await getOfficerProfilePictureUrl({
        profilePictureReference: row.profilePictureReference,
        userId: row.userId,
      }),
      roleName: row.roleName,
      userId: row.userId,
    })),
  );

  return listCurrentAlumniOfficers(assignments);
}

function derivedAdminState(
  post: Pick<
    typeof AlumniBulletinPost.$inferSelect,
    "archivedAt" | "expiresAt" | "publishAt" | "state"
  >,
  now = new Date(),
) {
  if (post.state === "archived" || post.archivedAt) return "archived" as const;
  if (post.state === "draft") return "draft" as const;
  if (post.expiresAt && post.expiresAt <= now) return "expired" as const;
  if (post.publishAt && post.publishAt > now) return "scheduled" as const;
  return "published" as const;
}

async function bulletinDto(
  post: typeof AlumniBulletinPost.$inferSelect & {
    formName?: string | null;
    formSlug?: string | null;
  },
) {
  return {
    archivedAt: post.archivedAt,
    body: post.body,
    createdAt: post.createdAt,
    ctaLabel: post.ctaLabel,
    displayOrder: post.displayOrder,
    expiresAt: post.expiresAt,
    externalUrl: post.externalUrl,
    formId: post.formId,
    formName: post.formName ?? null,
    formSlug: post.formSlug ?? null,
    id: post.id,
    imageAlt: post.imageAlt,
    imageUrl: await getAlumniBulletinImageUrl(post.imageObjectName),
    imageObjectName: post.imageObjectName,
    publishAt: post.publishAt,
    state: post.state,
    status: derivedAdminState(post),
    title: post.title,
    updatedAt: post.updatedAt,
  };
}

async function selectBulletinPosts() {
  return await db
    .select({
      archivedAt: AlumniBulletinPost.archivedAt,
      body: AlumniBulletinPost.body,
      createdAt: AlumniBulletinPost.createdAt,
      createdByUserId: AlumniBulletinPost.createdByUserId,
      ctaLabel: AlumniBulletinPost.ctaLabel,
      displayOrder: AlumniBulletinPost.displayOrder,
      expiresAt: AlumniBulletinPost.expiresAt,
      externalUrl: AlumniBulletinPost.externalUrl,
      formId: AlumniBulletinPost.formId,
      formName: FormsSchemas.name,
      formSlug: FormsSchemas.slugName,
      id: AlumniBulletinPost.id,
      imageAlt: AlumniBulletinPost.imageAlt,
      imageObjectName: AlumniBulletinPost.imageObjectName,
      publishAt: AlumniBulletinPost.publishAt,
      state: AlumniBulletinPost.state,
      title: AlumniBulletinPost.title,
      updatedAt: AlumniBulletinPost.updatedAt,
      updatedByUserId: AlumniBulletinPost.updatedByUserId,
    })
    .from(AlumniBulletinPost)
    .leftJoin(FormsSchemas, eq(FormsSchemas.id, AlumniBulletinPost.formId))
    .orderBy(
      asc(AlumniBulletinPost.displayOrder),
      desc(AlumniBulletinPost.updatedAt),
    );
}

export const alumniRouter = {
  resolveGraduation: protectedProcedure
    .input(alumniGraduationResolutionSchema)
    .mutation(async ({ ctx, input }) => {
      const member = await getMemberForUser(ctx.session.user.id);
      const mode = getAlumniDashboardMode(member);

      if (input.resolution === "graduated") {
        if (mode === "current") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Your saved graduation date has not passed yet.",
          });
        }

        const [updated] = await db
          .update(Member)
          .set({ alumniConfirmedAt: new Date() })
          .where(eq(Member.id, member.id))
          .returning({
            alumniConfirmedAt: Member.alumniConfirmedAt,
            gradDate: Member.gradDate,
          });
        return {
          ...updated,
          mode: "alumni" as const,
        };
      }

      const updated = await db.transaction(async (tx) => {
        const [nextMember] = await tx
          .update(Member)
          .set({
            alumniConfirmedAt: null,
            gradDate: input.gradDate,
          })
          .where(eq(Member.id, member.id))
          .returning({
            alumniConfirmedAt: Member.alumniConfirmedAt,
            gradDate: Member.gradDate,
          });
        if (!nextMember) throw new TRPCError({ code: "NOT_FOUND" });

        const signupResponse = await tx.query.FormResponse.findFirst({
          where: and(
            eq(FormResponse.userId, member.userId),
            eq(FormResponse.form, MEMBER_SIGNUP_FORM_ID),
          ),
          columns: {
            id: true,
            responseData: true,
          },
        });
        if (
          signupResponse &&
          typeof signupResponse.responseData === "object" &&
          signupResponse.responseData !== null &&
          !Array.isArray(signupResponse.responseData)
        ) {
          await tx
            .update(FormResponse)
            .set({
              editedAt: new Date(),
              responseData: {
                ...signupResponse.responseData,
                gradTerm: input.gradTerm,
                gradYear: input.gradYear,
              },
            })
            .where(eq(FormResponse.id, signupResponse.id));
        }
        return nextMember;
      });
      return {
        alumniConfirmedAt: updated.alumniConfirmedAt,
        gradDate: updated.gradDate,
        mode: "current" as const,
      };
    }),

  getDashboard: protectedProcedure.query(async ({ ctx }) => {
    const member = await getMemberForUser(ctx.session.user.id);
    const mode = getAlumniDashboardMode(member);
    const base = {
      firstName: member.firstName,
      gradDate: member.gradDate,
    };
    if (mode === "current") {
      return { ...base, mode: "current" as const };
    }
    if (mode === "needs_confirmation") {
      return { ...base, mode: "needs_confirmation" as const };
    }

    const [attendances, employment, bulletinPosts, officers] =
      await Promise.all([
        db
          .select({
            eventName: Event.name,
            eventType: sql<string>`'club'`,
            startAt: Event.start_datetime,
            tagName: Event.tag,
          })
          .from(EventAttendee)
          .innerJoin(Event, eq(Event.id, EventAttendee.eventId))
          .where(
            and(
              eq(EventAttendee.memberId, member.id),
              isNull(Event.hackathonId),
            ),
          ),
        db
          .select({
            company: Company.displayName,
            startMonth: Employment.startMonth,
            state: Employment.state,
            title: Employment.title,
          })
          .from(Employment)
          .innerJoin(Company, eq(Company.id, Employment.companyId))
          .where(eq(Employment.memberId, member.id))
          .orderBy(
            asc(
              sql<number>`CASE ${Employment.state} WHEN 'current' THEN 0 WHEN 'past' THEN 1 ELSE 2 END`,
            ),
            desc(Employment.startMonth),
          ),
        selectBulletinPosts(),
        getCurrentOfficers(),
      ]);
    const currentEmployment = employment.find(
      (experience) => experience.state === "current",
    );
    const activeBulletin = listActiveBulletinPosts(bulletinPosts);

    return {
      ...base,
      bulletin: await Promise.all(
        activeBulletin.map(async (post) => {
          const dto = await bulletinDto(post);
          return {
            body: dto.body,
            ctaLabel: dto.ctaLabel,
            externalUrl: dto.externalUrl,
            formId: dto.formId,
            formSlug: dto.formSlug,
            id: dto.id,
            imageAlt: dto.imageAlt,
            imageUrl: dto.imageUrl,
            title: dto.title,
          };
        }),
      ),
      career: {
        currentEmployer: currentEmployment?.company ?? null,
        currentTitle: currentEmployment?.title ?? null,
        historyCount: employment.length,
      },
      mode: "alumni" as const,
      officers,
      recap: buildAlumniRecap({
        attendances,
        member: {
          dateCreated: member.dateCreated,
          gradDate: member.gradDate,
          points: member.points,
        },
      }),
    };
  }),

  listBulletinAdmin: permProcedure.query(async ({ ctx }) => {
    assertCanManageAlumni(ctx);
    const posts = await selectBulletinPosts();
    return await Promise.all(posts.map(bulletinDto));
  }),

  listLinkableForms: permProcedure.query(async ({ ctx }) => {
    assertCanManageAlumni(ctx);
    return await db
      .select({
        id: FormsSchemas.id,
        name: FormsSchemas.name,
        slug: FormsSchemas.slugName,
      })
      .from(FormsSchemas)
      .where(
        and(
          eq(FormsSchemas.state, "published"),
          ne(FormsSchemas.kind, "system"),
        ),
      )
      .orderBy(asc(FormsSchemas.name));
  }),

  createBulletinPost: permProcedure
    .input(alumniBulletinPostSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageAlumni(ctx);
      const [orderRow] = await db
        .select({
          nextOrder: sql<number>`coalesce(max(${AlumniBulletinPost.displayOrder}), -1) + 1`,
        })
        .from(AlumniBulletinPost);
      const nextOrder = orderRow?.nextOrder ?? 0;
      const [created] = await db
        .insert(AlumniBulletinPost)
        .values({
          ...input,
          createdByUserId: ctx.session.user.id,
          displayOrder: input.displayOrder ?? nextOrder,
          updatedByUserId: ctx.session.user.id,
        })
        .returning();
      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Bulletin post could not be created.",
        });
      }
      return await bulletinDto(created);
    }),

  updateBulletinPost: permProcedure
    .input(alumniBulletinUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageAlumni(ctx);
      const existing = await db.query.AlumniBulletinPost.findFirst({
        where: eq(AlumniBulletinPost.id, input.postId),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const { postId, ...values } = input;
      const [updated] = await db
        .update(AlumniBulletinPost)
        .set({
          ...values,
          archivedAt: values.state === "archived" ? new Date() : null,
          updatedByUserId: ctx.session.user.id,
        })
        .where(eq(AlumniBulletinPost.id, postId))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      if (
        existing.imageObjectName &&
        existing.imageObjectName !== updated.imageObjectName
      ) {
        await removeAlumniBulletinImage(existing.imageObjectName);
      }
      return await bulletinDto(updated);
    }),

  reorderBulletinPosts: permProcedure
    .input(alumniReorderBulletinPostsSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageAlumni(ctx);
      const reorderable = await db
        .select({ id: AlumniBulletinPost.id })
        .from(AlumniBulletinPost)
        .where(ne(AlumniBulletinPost.state, "archived"));
      const expected = new Set(reorderable.map((post) => post.id));
      if (
        input.postIds.length !== expected.size ||
        input.postIds.some((postId) => !expected.has(postId))
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Refresh the bulletin before reordering it.",
        });
      }

      await db.transaction(async (tx) => {
        await Promise.all(
          input.postIds.map((postId, displayOrder) =>
            tx
              .update(AlumniBulletinPost)
              .set({
                displayOrder,
                updatedByUserId: ctx.session.user.id,
              })
              .where(eq(AlumniBulletinPost.id, postId)),
          ),
        );
      });
      return { reordered: true };
    }),

  archiveBulletinPost: permProcedure
    .input(alumniBulletinIdSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageAlumni(ctx);
      const [archived] = await db
        .update(AlumniBulletinPost)
        .set({
          archivedAt: new Date(),
          state: "archived",
          updatedByUserId: ctx.session.user.id,
        })
        .where(eq(AlumniBulletinPost.id, input.postId))
        .returning({ id: AlumniBulletinPost.id });
      if (!archived) throw new TRPCError({ code: "NOT_FOUND" });
      return archived;
    }),

  restoreBulletinPost: permProcedure
    .input(alumniBulletinIdSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageAlumni(ctx);
      const [restored] = await db
        .update(AlumniBulletinPost)
        .set({
          archivedAt: null,
          expiresAt: null,
          publishAt: null,
          state: "draft",
          updatedByUserId: ctx.session.user.id,
        })
        .where(eq(AlumniBulletinPost.id, input.postId))
        .returning({ id: AlumniBulletinPost.id });
      if (!restored) throw new TRPCError({ code: "NOT_FOUND" });
      return restored;
    }),

  uploadBulletinImage: permProcedure
    .input(alumniBulletinImageUploadSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageAlumni(ctx);
      return {
        objectName: await uploadAlumniBulletinImage({
          fileContent: input.fileContent,
          userId: ctx.session.user.id,
        }),
      };
    }),

  removeBulletinImage: permProcedure
    .input(alumniBulletinImageRemoveSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageAlumni(ctx);
      await removeAlumniBulletinImage(input.objectName);
      return { removed: true };
    }),
} satisfies TRPCRouterRecord;
