import type { JSONSchema7 } from "json-schema";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import jsonSchemaToZod from "json-schema-to-zod";
import * as z from "zod";

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
        name: true,
        createdAt: true,
        formData: true,
        formValidatorJson: true,
      }).extend({ formData: FormSchemaValidator }),
    )
    .mutation(async ({ input }) => {
      const jsonSchema = generateJsonSchema(input.formData);

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
          formValidatorJson: jsonSchema.schema,
        })
        .onConflictDoUpdate({
          //If it already exists upsert it
          target: FormsSchemas.name,
          set: {
            ...input,
            formValidatorJson: jsonSchema.schema,
          },
        });
    }),

  updateForm: adminProcedure
    .input(
      FormSchemaSchema.omit({
        name: true,
        createdAt: true,
        formData: true,
        formValidatorJson: true,
      }).extend({ formData: FormSchemaValidator }),
    )
    .mutation(async ({ input }) => {
      const jsonSchema = generateJsonSchema(input.formData);

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
          duesOnly: input.duesOnly ?? false,
          allowResubmission: input.allowResubmission ?? false,
          formValidatorJson: jsonSchema.schema,
        })
        .onConflictDoUpdate({
          //If it already exists upsert it
          target: FormsSchemas.name,
          set: {
            ...input,
            duesOnly: input.duesOnly ?? false,
            allowResubmission: input.allowResubmission ?? false,
            formValidatorJson: jsonSchema.schema,
          },
        });
    }),

  getForm: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input }) => {
      const form = await db.query.FormsSchemas.findFirst({
        where: (t, { eq }) => eq(t.name, input.name),
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
        formData: form.formData as FormData,
        zodValidator: jsonSchemaToZod(form.formValidatorJson as JSONSchema7),
      };
    }),

  createResponse: protectedProcedure
    .input(InsertFormResponseSchema.omit({ userId: true }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      // validate response
      const form = await db.query.FormsSchemas.findFirst({
        where: (t, { eq }) => eq(t.name, input.form),
      });

      if (!form) {
        throw new TRPCError({
          message: "Form doesn't exist for response",
          code: "BAD_REQUEST",
        });
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
};
