import type { JSONSchema7 } from "json-schema";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, lt, sql } from "drizzle-orm";
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
import {
  FormResponse,
  FormSchemaSchema,
  FormsSchemas,
  InsertFormResponseSchema,
  Member,
  TrpcFormConnection,
  TrpcFormConnectionSchema,
} from "@forge/db/schemas/knight-hacks";

import { minioClient } from "../minio/minio-client";
import { adminProcedure, protectedProcedure, publicProcedure } from "../trpc";
import {
  controlPerms,
  generateJsonSchema,
  log,
  regenerateMediaUrls,
} from "../utils";

interface FormSchemaRow {
  name: string;
  createdAt: Date;
  formData: FormData;
  formValidatorJson: JSONSchema7;
}

export const formsRouter = {
  createForm: adminProcedure
    .input(
      FormSchemaSchema.omit({
        id: true,
        name: true,
        slugName: true,
        createdAt: true,
        formData: true,
        formValidatorJson: true,
      }).extend({ formData: FormSchemaValidator }),
    )
    .mutation(async ({ input, ctx }) => {
      controlPerms.and(["EDIT_FORMS"], ctx);

      const jsonSchema = generateJsonSchema(input.formData);

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

  updateForm: adminProcedure
    .input(
      FormSchemaSchema.omit({
        name: true,
        slugName: true,
        createdAt: true,
        formData: true,
        formValidatorJson: true,
      }).extend({ formData: FormSchemaValidator }),
    )
    .mutation(async ({ input }) => {
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

  getForm: publicProcedure
    .input(z.object({ slug_name: z.string() }))
    .query(async ({ input }) => {
      console.log(input);
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

  deleteForm: adminProcedure
    .input(z.object({ slug_name: z.string() }))
    .mutation(async ({ input }) => {
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

  getForms: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().nullish(),
      }),
    )
    .query(async ({ input }) => {
      const { cursor } = input;
      const limit = input.limit;

      const forms = await db.query.FormsSchemas.findMany({
        limit: limit + 1,

        where: cursor
          ? lt(FormsSchemas.createdAt, new Date(cursor))
          : undefined,
        orderBy: [desc(FormsSchemas.createdAt)],
        columns: {
          slugName: true,
          createdAt: true,
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

  addConnection: adminProcedure
    .input(TrpcFormConnectionSchema)
    .mutation(async ({ input }) => {
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

  deleteConnection: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
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

  getResponses: adminProcedure
    .input(z.object({ form: z.string() }))
    .query(async ({ input }) => {
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

  // check if current user already submitted to this form
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
  getUploadUrl: adminProcedure
    .input(
      z.object({
        fileName: z.string(),
        formId: z.string(),
        mediaType: z.enum(["image", "video"]),
      }),
    )
    .mutation(async ({ input }) => {
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

  deleteMedia: adminProcedure
    .input(
      z.object({
        objectName: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
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
};
