import type { JSONSchema7 } from "json-schema";
import { TRPCError } from "@trpc/server";
import { desc, eq, lt } from "drizzle-orm";
import jsonSchemaToZod from "json-schema-to-zod";
import * as z from "zod";

import type { FormType } from "@forge/consts/knight-hacks";
import { FormSchemaValidator } from "@forge/consts/knight-hacks";
import { db } from "@forge/db/client";
import {
  FormResponse,
  FormSchemaSchema,
  FormsSchemas,
  InsertFormResponseSchema,
  Member,
} from "@forge/db/schemas/knight-hacks";

import { adminProcedure, protectedProcedure, publicProcedure } from "../trpc";
import { generateJsonSchema } from "../utils";

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
    .mutation(async ({ input }) => {
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

      return {
        ...retForm,
        formData: form.formData as FormType,
        zodValidator: jsonSchemaToZod(form.formValidatorJson as JSONSchema7),
      };
    }),

  deleteForm: adminProcedure
    .input(z.object({ slug_name: z.string() }))
    .mutation(async ({ input }) => {
      const deletion = await db
        .delete(FormsSchemas)
        .where(eq(FormsSchemas.slugName, input.slug_name))
        .returning({ slugName: FormsSchemas.slugName });

      if (deletion.length === 0) {
        throw new TRPCError({
          message: "Form not found",
          code: "NOT_FOUND",
        });
      }
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
    .input(z.object({ form: z.string() }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      const existing = await db.query.FormResponse.findFirst({
        where: (t, { eq, and }) =>
          and(eq(t.form, input.form), eq(t.userId, userId)),
      });

      return {
        hasSubmitted: !!existing,
        submittedAt: existing?.createdAt ?? null,
      };
    }),
};
