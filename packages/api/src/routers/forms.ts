import type { JSONSchema7 } from "json-schema";
import { TRPCError } from "@trpc/server";
import jsonSchemaToZod from "json-schema-to-zod";
import * as z from "zod";
import { desc, eq } from "drizzle-orm";

import { FormSchemaValidator } from "@forge/consts/knight-hacks";
import { db } from "@forge/db/client";
import { FormsSchemas } from "@forge/db/schemas/knight-hacks";

import { adminProcedure, publicProcedure } from "../trpc";
import { generateJsonSchema } from "../utils";
import { FormResponse, Member } from "@forge/db/schemas/knight-hacks";

interface FormSchemaRow {
  name: string;
  createdAt: Date;
  formData: FormData;
  formValidatorJson: JSONSchema7;
}

export const formsRouter = {
  createForm: adminProcedure
    .input(FormSchemaValidator)
    .mutation(async ({ input }) => {
      const jsonSchema = generateJsonSchema(input);

      if (!jsonSchema.success) {
        throw new TRPCError({
          message: jsonSchema.msg,
          code: "BAD_REQUEST",
        });
      }

      await db
        .insert(FormsSchemas)
        .values({
          name: input.name,
          formData: input,
          formValidatorJson: jsonSchema.schema,
        })
        .onConflictDoUpdate({
          //If it already exists upsert it
          target: FormsSchemas.name,
          set: {
            formData: input,
            formValidatorJson: jsonSchema.schema,
          },
        });
    }),

  getForm: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input }) => {
      const form = (await db.query.FormsSchemas.findFirst({
        where: (t, { eq }) => eq(t.name, input.name),
      })) as FormSchemaRow;
      return {
        formData: form.formData,
        zodValidator: jsonSchemaToZod(form.formValidatorJson),
      };
    }),

    getResponses: adminProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input }) => {
      return await db
        .select({
          submittedAt: FormResponse.createdAt,
          responseData: FormResponse.responseData,
          member: {
            firstName: Member.firstName,
            lastName: Member.lastName,
            email: Member.email,
          },
        })
        .from(FormResponse)
        .leftJoin(Member, eq(FormResponse.userId, Member.id))
        .where(eq(FormResponse.form, input.name))
        .orderBy(desc(FormResponse.createdAt));
    }),
};
