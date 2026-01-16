import type { JSONSchema7 } from "json-schema";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, inArray, lt, sql } from "drizzle-orm";
import jsonSchemaToZod from "json-schema-to-zod";
import * as z from "zod";

import type { FormType } from "@forge/consts/knight-hacks";
import {
  FORM_ASSETS_BUCKET,
  FormSchemaValidator,
  KNIGHTHACKS_S3_BUCKET_REGION,
  PRESIGNED_URL_EXPIRY,
} from "@forge/consts/knight-hacks";
import { db } from "@forge/db/client";
import { Permissions, Roles } from "@forge/db/schemas/auth";
import {
  FormResponse,
  FormSchemaSchema,
  FormSectionRoles,
  FormSections,
  FormsSchemas,
  InsertFormResponseSchema,
  Member,
  TrpcFormConnection,
  TrpcFormConnectionSchema,
} from "@forge/db/schemas/knight-hacks";

import { minioClient } from "../minio/minio-client";
import { permProcedure, protectedProcedure } from "../trpc";
import {
  controlPerms,
  generateJsonSchema,
  log,
  regenerateMediaUrls,
} from "../utils";

export const formsRouter = {
  createForm: permProcedure
    .input(
      FormSchemaSchema.omit({
        id: true,
        name: true,
        slugName: true,
        createdAt: true,
        formData: true,
        formValidatorJson: true,
      })
        .extend({ formData: FormSchemaValidator })
        .extend({ section: z.string().optional() }),
    )
    .mutation(async ({ input, ctx }) => {
      controlPerms.or(["EDIT_FORMS"], ctx);

      const jsonSchema = generateJsonSchema(input.formData);

      const slug_name = input.formData.name.toLowerCase().replaceAll(" ", "-");

      if (!jsonSchema.success) {
        throw new TRPCError({
          message: jsonSchema.msg,
          code: "BAD_REQUEST",
        });
      }

      let sectionId: string | null = null;
      const sectionName = input.section ?? "General";

      if (sectionName !== "General") {
        const section = await db.query.FormSections.findFirst({
          where: (t, { eq }) => eq(t.name, sectionName),
        });
        sectionId = section?.id ?? null;
      }

      await db
        .insert(FormsSchemas)
        .values({
          ...input,
          name: input.formData.name,
          slugName: slug_name,
          formValidatorJson: jsonSchema.schema,
          section: sectionName,
          sectionId,
        })
        .onConflictDoUpdate({
          //If it already exists upsert it
          target: FormsSchemas.id,
          set: {
            ...input,
            name: input.formData.name,
            slugName: slug_name,
            formValidatorJson: jsonSchema.schema,
            section: sectionName,
            sectionId,
          },
        });
    }),

  updateForm: permProcedure
    .input(
      FormSchemaSchema.omit({
        name: true,
        slugName: true,
        createdAt: true,
        formData: true,
        formValidatorJson: true,
      }).extend({ formData: FormSchemaValidator }),
    )
    .mutation(async ({ input, ctx }) => {
      controlPerms.or(["EDIT_FORMS"], ctx);
      const jsonSchema = generateJsonSchema(input.formData);
      console.log(input);

      const slug_name = input.formData.name.toLowerCase().replaceAll(" ", "-");

      if (!jsonSchema.success) {
        throw new TRPCError({
          message: jsonSchema.msg,
          code: "BAD_REQUEST",
        });
      }

      await db
        .insert(FormsSchemas)
        .values({
          ...input,
          name: input.formData.name,
          slugName: slug_name,
          formValidatorJson: jsonSchema.schema,
        })
        .onConflictDoUpdate({
          //If it already exists upsert it
          target: FormsSchemas.id,
          set: {
            ...input,
            name: input.formData.name,
            slugName: slug_name,
            formValidatorJson: jsonSchema.schema,
          },
        });
    }),

  getForm: protectedProcedure
    .input(z.object({ slug_name: z.string() }))
    .query(async ({ input }) => {
      const form = await db.query.FormsSchemas.findFirst({
        where: (t, { eq }) => eq(t.slugName, input.slug_name),
      });

      if (form === undefined) {
        throw new TRPCError({
          message: "Form not found",
          code: "BAD_REQUEST",
        });
      }

      const { formValidatorJson: _JSONValidator, ...retForm } = form;
      const formData = form.formData as FormType;

      // Regenerate presigned URLs for any media that has objectNames
      const instructionsWithFreshUrls = await regenerateMediaUrls(
        formData.instructions,
      );

      return {
        ...retForm,
        formData: {
          ...formData,
          instructions: instructionsWithFreshUrls,
        },
        zodValidator: jsonSchemaToZod(form.formValidatorJson as JSONSchema7),
      };
    }),

  deleteForm: permProcedure
    .input(z.object({ slug_name: z.string() }))
    .mutation(async ({ input, ctx }) => {
      controlPerms.or(["EDIT_FORMS"], ctx);
      // find the form to delete duh
      const form = await db.query.FormsSchemas.findFirst({
        where: (t, { eq }) => eq(t.slugName, input.slug_name),
      });

      if (!form) {
        throw new TRPCError({
          message: "Form not found",
          code: "NOT_FOUND",
        });
      }
      // below is new cascading logic!
      // del all responses linked to that form
      await db.delete(FormResponse).where(eq(FormResponse.form, form.id));

      // del the form itself
      await db
        .delete(FormsSchemas)
        .where(eq(FormsSchemas.id, form.id))
        .returning({ slugName: FormsSchemas.slugName });
    }),

  getForms: permProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().nullish(),
        section: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      controlPerms.or(["READ_FORMS", "EDIT_FORMS"], ctx);
      const { cursor, section } = input;
      const limit = input.limit;

      const forms = await db.query.FormsSchemas.findMany({
        limit: limit + 1,

        where: cursor
          ? section
            ? and(
                lt(FormsSchemas.createdAt, new Date(cursor)),
                eq(FormsSchemas.section, section),
              )
            : lt(FormsSchemas.createdAt, new Date(cursor))
          : section
            ? eq(FormsSchemas.section, section)
            : undefined,
        orderBy: [desc(FormsSchemas.createdAt)],
        columns: {
          slugName: true,
          createdAt: true,
          section: true,
        },
      });

      let nextCursor: string | undefined = undefined;

      if (forms.length > limit) {
        const nextItem = forms.pop();
        nextCursor = nextItem?.createdAt.toISOString();
      }

      return {
        forms,
        nextCursor,
      };
    }),

  addConnection: permProcedure
    .input(TrpcFormConnectionSchema)
    .mutation(async ({ input, ctx }) => {
      controlPerms.or(["EDIT_FORMS"], ctx);
      try {
        await db.insert(TrpcFormConnection).values({ ...input });
      } catch {
        throw new TRPCError({
          message: "Could not insert connection into database",
          code: "BAD_REQUEST",
        });
      }
    }),

  getConnections: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      try {
        const connections = db.query.TrpcFormConnection.findMany({
          where: (t, { eq }) => eq(t.form, input.id),
        });
        return connections;
      } catch {
        throw new TRPCError({
          message: "Could not get connections from the database",
          code: "BAD_REQUEST",
        });
      }
    }),

  deleteConnection: permProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      controlPerms.or(["EDIT_FORMS"], ctx);
      try {
        await db
          .delete(TrpcFormConnection)
          .where(eq(TrpcFormConnection.id, input.id));
      } catch {
        throw new TRPCError({
          message: "Could not delete connection",
          code: "BAD_REQUEST",
        });
      }
    }),

  createResponse: protectedProcedure
    .input(InsertFormResponseSchema.omit({ userId: true }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      // validate response
      const form = await db.query.FormsSchemas.findFirst({
        where: (t, { eq }) => eq(t.id, input.form),
      });

      if (!form) {
        throw new TRPCError({
          message: "Form doesn't exist for response",
          code: "BAD_REQUEST",
        });
      }

      // check if user already submitted and form doesnt allow resubmission
      if (!form.allowResubmission) {
        const existing = await db.query.FormResponse.findFirst({
          where: (t, { eq, and }) =>
            and(eq(t.form, input.form), eq(t.userId, userId)),
        });

        if (existing) {
          throw new TRPCError({
            message: "You have already submitted a response to this form",
            code: "BAD_REQUEST",
          });
        }
      }

      const zodSchemaString = jsonSchemaToZod(
        form.formValidatorJson as JSONSchema7,
      );

      // create js function at runtime to create a zod object
      // input is trusted and generated internally
      // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call
      const zodSchema = new Function("z", `return ${zodSchemaString}`)(
        z,
      ) as z.ZodSchema;

      const response = zodSchema.safeParse(input.responseData);

      if (!response.success) {
        throw new TRPCError({
          message: "Form response failed form validation",
          code: "BAD_REQUEST",
        });
      }

      await db.insert(FormResponse).values({
        userId,
        ...input,
      });

      await log({
        title: `Form submitted to blade forms`,
        message: `**Form submitted:** ${form.name}\n**User:** ${ctx.session.user.name}`,
        color: "success_green",
        userId: ctx.session.user.discordUserId,
      });
    }),

  getResponses: permProcedure
    .input(z.object({ form: z.string() }))
    .query(async ({ input, ctx }) => {
      controlPerms.or(["READ_FORMS", "EDIT_FORMS"], ctx);
      return await db
        .select({
          submittedAt: FormResponse.createdAt,
          responseData: FormResponse.responseData,
          member: {
            firstName: Member.firstName,
            lastName: Member.lastName,
            email: Member.email,
            id: Member.userId,
          },
        })
        .from(FormResponse)
        .leftJoin(Member, eq(FormResponse.userId, Member.userId))
        .where(eq(FormResponse.form, input.form))
        .orderBy(desc(FormResponse.createdAt));
    }),

  getUserResponse: protectedProcedure
    .input(
      z.object({
        form: z.string().optional(),
        responseId: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      // return response by id
      const responseId = input.responseId;
      if (responseId) {
        return await db
          .select({
            submittedAt: FormResponse.createdAt,
            responseData: FormResponse.responseData,
            formName: FormsSchemas.name,
            formSlug: FormsSchemas.slugName,
            id: FormResponse.id,
            hasSubmitted: sql<boolean>`true`,
          })
          .from(FormResponse)
          .leftJoin(FormsSchemas, eq(FormResponse.form, FormsSchemas.id))
          .where(
            and(
              eq(FormResponse.id, responseId),
              eq(FormResponse.userId, userId),
            ),
          );
      }

      // return all responses all forms
      const form = input.form;
      if (!form) {
        return await db
          .select({
            submittedAt: FormResponse.createdAt,
            responseData: FormResponse.responseData,
            formName: FormsSchemas.name,
            formSlug: FormsSchemas.slugName,
            id: FormResponse.id,
            hasSubmitted: sql<boolean>`true`,
          })
          .from(FormResponse)
          .leftJoin(FormsSchemas, eq(FormResponse.form, FormsSchemas.id))
          .where(eq(FormResponse.userId, userId))
          .orderBy(desc(FormResponse.createdAt));
      }

      // return all responses of form
      return await db
        .select({
          submittedAt: FormResponse.createdAt,
          responseData: FormResponse.responseData,
          formName: FormsSchemas.name,
          formSlug: FormsSchemas.slugName,
          id: FormResponse.id,
          hasSubmitted: sql<boolean>`true`,
        })
        .from(FormResponse)
        .leftJoin(FormsSchemas, eq(FormResponse.form, FormsSchemas.id))
        .where(
          and(eq(FormResponse.userId, userId), eq(FormsSchemas.name, form)),
        )
        .orderBy(desc(FormResponse.createdAt));
    }),

  // Generate presigned upload URL for direct MinIO upload
  getUploadUrl: permProcedure
    .input(
      z.object({
        fileName: z.string(),
        formId: z.string(),
        mediaType: z.enum(["image", "video"]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      controlPerms.or(["EDIT_FORMS"], ctx);
      const { fileName, formId, mediaType } = input;

      const safeFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const folder = mediaType === "image" ? "images" : "videos";
      const objectName = `${formId}/${folder}/${Date.now()}-${safeFileName}`;

      try {
        // Ensure bucket exists
        const bucketExists = await minioClient.bucketExists(FORM_ASSETS_BUCKET);
        if (!bucketExists) {
          await minioClient.makeBucket(
            FORM_ASSETS_BUCKET,
            KNIGHTHACKS_S3_BUCKET_REGION,
          );
        }

        // Generate presigned PUT URL for upload (15 minutes to complete upload)
        const uploadUrl = await minioClient.presignedPutObject(
          FORM_ASSETS_BUCKET,
          objectName,
          15 * 60, // 15 minutes
        );

        // Generate presigned GET URL for immediate preview
        const viewUrl = await minioClient.presignedGetObject(
          FORM_ASSETS_BUCKET,
          objectName,
          PRESIGNED_URL_EXPIRY,
        );

        return { uploadUrl, objectName, viewUrl };
      } catch (e) {
        console.error("getUploadUrl error:", e);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate upload URL",
        });
      }
    }),

  deleteMedia: permProcedure
    .input(
      z.object({
        objectName: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      controlPerms.or(["EDIT_FORMS"], ctx);
      const { objectName } = input;

      try {
        await minioClient.removeObject(FORM_ASSETS_BUCKET, objectName);
        return { success: true };
      } catch (e) {
        console.error("deleteMedia error:", e);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete media",
        });
      }
    }),

  getSections: permProcedure.query(async ({ ctx }) => {
    controlPerms.or(["READ_FORMS", "EDIT_FORMS"], ctx);

    const isOfficer = ctx.session.permissions.IS_OFFICER;

    const userRoleIds = isOfficer
      ? []
      : (
          await db
            .select({ roleId: Permissions.roleId })
            .from(Permissions)
            .where(
              sql`cast(${Permissions.userId} as text) = ${ctx.session.user.id}`,
            )
        ).map((r) => r.roleId);

    const sectionRoles = await db
      .select({
        sectionId: FormSectionRoles.sectionId,
        roleId: FormSectionRoles.roleId,
      })
      .from(FormSectionRoles);

    const sectionToRolesMap = new Map<string, string[]>();
    for (const sr of sectionRoles) {
      const existing = sectionToRolesMap.get(sr.sectionId) ?? [];
      existing.push(sr.roleId);
      sectionToRolesMap.set(sr.sectionId, existing);
    }

    const allDbSections = await db
      .select({ id: FormSections.id, name: FormSections.name })
      .from(FormSections);

    const sectionIdToName = new Map<string, string>();
    for (const section of allDbSections) {
      sectionIdToName.set(section.id, section.name);
    }

    const accessibleSectionIds = new Set<string>();
    if (isOfficer) {
      for (const section of allDbSections) {
        accessibleSectionIds.add(section.id);
      }
    } else {
      for (const section of allDbSections) {
        const sectionRoleIds = sectionToRolesMap.get(section.id) ?? [];
        if (sectionRoleIds.length === 0) {
          accessibleSectionIds.add(section.id);
        } else if (
          sectionRoleIds.some((roleId) => userRoleIds.includes(roleId))
        ) {
          accessibleSectionIds.add(section.id);
        }
      }
    }

    const formSections = await db
      .selectDistinct({
        section: FormsSchemas.section,
        sectionId: FormsSchemas.sectionId,
      })
      .from(FormsSchemas);

    const allSections = new Set<string>();

    const hasGeneralForms = formSections.some((f) => f.sectionId === null);
    if (hasGeneralForms) {
      allSections.add("General");
    }

    for (const sectionId of accessibleSectionIds) {
      const sectionName = sectionIdToName.get(sectionId);
      if (sectionName) {
        allSections.add(sectionName);
      }
    }

    for (const formSection of formSections) {
      if (
        formSection.sectionId &&
        accessibleSectionIds.has(formSection.sectionId)
      ) {
        const sectionName = sectionIdToName.get(formSection.sectionId);
        if (sectionName) {
          allSections.add(sectionName);
        }
      }
    }

    return Array.from(allSections).sort();
  }),

  getSectionCounts: permProcedure.query(async ({ ctx }) => {
    controlPerms.or(["READ_FORMS", "EDIT_FORMS"], ctx);
    const counts = await db
      .select({
        section: FormsSchemas.section,
        count: count(),
      })
      .from(FormsSchemas)
      .groupBy(FormsSchemas.section)
      .orderBy(FormsSchemas.section);
    return counts.map((c) => ({
      section: c.section,
      count: Number(c.count),
    }));
  }),

  updateFormSection: permProcedure
    .input(
      z.object({
        slug_name: z.string(),
        section: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      controlPerms.or(["EDIT_FORMS"], ctx);
      const form = await db.query.FormsSchemas.findFirst({
        where: (t, { eq }) => eq(t.slugName, input.slug_name),
      });

      if (!form) {
        throw new TRPCError({
          message: "Form not found",
          code: "NOT_FOUND",
        });
      }
      const oldSection = form.section;

      // Look up the section by name to get its ID
      let sectionId: string | null = null;
      if (input.section !== "General") {
        const section = await db.query.FormSections.findFirst({
          where: (t, { eq }) => eq(t.name, input.section),
        });
        sectionId = section?.id ?? null;
      }

      await db
        .update(FormsSchemas)
        .set({ section: input.section, sectionId })
        .where(eq(FormsSchemas.id, form.id));

      await log({
        title: `Form section updated`,
        message: `**Form:** ${form.name}\n**Section:** ${oldSection} -> ${input.section}`,
        color: "success_green",
        userId: ctx.session.user.discordUserId,
      });
    }),

  renameSection: permProcedure
    .input(
      z.object({
        oldName: z.string(),
        newName: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      controlPerms.or(["EDIT_FORMS"], ctx);

      await db
        .update(FormSections)
        .set({ name: input.newName })
        .where(eq(FormSections.name, input.oldName));

      await db
        .update(FormsSchemas)
        .set({ section: input.newName })
        .where(eq(FormsSchemas.section, input.oldName));

      await log({
        title: `Form section renamed`,
        message: `**Form section:** ${input.oldName} -> ${input.newName}`,
        color: "success_green",
        userId: ctx.session.user.discordUserId,
      });
    }),

  deleteSection: permProcedure
    .input(z.object({ section: z.string() }))
    .mutation(async ({ input, ctx }) => {
      controlPerms.or(["EDIT_FORMS"], ctx);
      await db
        .update(FormsSchemas)
        .set({ section: "General", sectionId: null })
        .where(eq(FormsSchemas.section, input.section));

      const sectionToDelete = await db.query.FormSections.findFirst({
        where: (t, { eq }) => eq(t.name, input.section),
      });
      if (sectionToDelete) {
        await db
          .delete(FormSectionRoles)
          .where(eq(FormSectionRoles.sectionId, sectionToDelete.id));
        await db
          .delete(FormSections)
          .where(eq(FormSections.id, sectionToDelete.id));

        await log({
          title: `Form section deleted`,
          message: `**Form section:** ${input.section}. All forms in this section have been moved to the "General" section.`,
          color: "uhoh_red",
          userId: ctx.session.user.discordUserId,
        });
      }
    }),

  createSection: permProcedure
    .input(
      z.object({
        name: z.string().min(1),
        roleIds: z.array(z.string().uuid()).optional().default([]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      controlPerms.or(["EDIT_FORMS"], ctx);

      const existing = await db.query.FormSections.findFirst({
        where: (t, { eq }) => eq(t.name, input.name),
      });

      if (existing) {
        throw new TRPCError({
          message: "Section already exists",
          code: "CONFLICT",
        });
      }

      const isOfficer = ctx.session.permissions.IS_OFFICER;

      if (input.roleIds.length && !isOfficer) {
        const userRoles = await db
          .select({ roleId: Permissions.roleId })
          .from(Permissions)
          .where(
            sql`cast(${Permissions.userId} as text) = ${ctx.session.user.id}`,
          );

        const userRoleIds = new Set(userRoles.map((r) => r.roleId));

        const hasAllRoles = input.roleIds.every((roleId) =>
          userRoleIds.has(roleId),
        );

        if (!hasAllRoles) {
          throw new TRPCError({
            message:
              "You don't have permission to create sections for one or more of the selected roles",
            code: "UNAUTHORIZED",
          });
        }
      }

      const [newSection] = await db
        .insert(FormSections)
        .values({
          name: input.name,
        })
        .returning();

      if (!newSection) {
        throw new TRPCError({
          message: "Failed to create section",
          code: "INTERNAL_SERVER_ERROR",
        });
      }

      if (input.roleIds.length) {
        await db.insert(FormSectionRoles).values(
          input.roleIds.map((roleId) => ({
            sectionId: newSection.id,
            roleId,
          })),
        );
      }

      const roleNames = await db
        .select({ name: Roles.name })
        .from(Roles)
        .where(inArray(Roles.id, input.roleIds));

      await log({
        title: `Form section created`,
        message: `**Form section:** ${input.name}. Roles: ${roleNames.map((r) => r.name).join(", ")}`,
        color: "success_green",
        userId: ctx.session.user.discordUserId,
      });
    }),

  checkFormEditAccess: permProcedure
    .input(z.object({ slug_name: z.string() }))
    .query(async ({ input, ctx }) => {
      controlPerms.or(["EDIT_FORMS"], ctx);

      const isOfficer = ctx.session.permissions.IS_OFFICER;

      if (isOfficer) {
        return { canEdit: true };
      }

      const form = await db.query.FormsSchemas.findFirst({
        where: (t, { eq }) => eq(t.slugName, input.slug_name),
        columns: { sectionId: true, section: true },
      });

      if (!form) {
        return { canEdit: false };
      }

      let formSectionId = form.sectionId;
      if (!formSectionId && form.section) {
        if (form.section === "General") {
          return { canEdit: true };
        }
        const section = await db.query.FormSections.findFirst({
          where: (t, { eq }) => eq(t.name, form.section),
        });
        formSectionId = section?.id ?? null;
      }

      if (!formSectionId) {
        return { canEdit: true };
      }

      const userRoleIds = (
        await db
          .select({ roleId: Permissions.roleId })
          .from(Permissions)
          .where(
            sql`cast(${Permissions.userId} as text) = ${ctx.session.user.id}`,
          )
      ).map((r) => r.roleId);

      const sectionRoles = await db
        .select({
          sectionId: FormSectionRoles.sectionId,
          roleId: FormSectionRoles.roleId,
        })
        .from(FormSectionRoles);

      const sectionToRolesMap = new Map<string, string[]>();
      for (const sr of sectionRoles) {
        const existing = sectionToRolesMap.get(sr.sectionId) ?? [];
        existing.push(sr.roleId);
        sectionToRolesMap.set(sr.sectionId, existing);
      }

      const allDbSections = await db
        .select({ id: FormSections.id, name: FormSections.name })
        .from(FormSections);

      const sectionExists = allDbSections.some(
        (section) => section.id === formSectionId,
      );

      if (!sectionExists) {
        return { canEdit: false };
      }

      const sectionRoleIds = sectionToRolesMap.get(formSectionId) ?? [];

      if (sectionRoleIds.length === 0) {
        return { canEdit: true };
      }

      const hasSectionRole = sectionRoleIds.some((roleId) =>
        userRoleIds.includes(roleId),
      );

      return { canEdit: hasSectionRole };
    }),
};
