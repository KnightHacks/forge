import type { JSONSchema7 } from "json-schema";
import { TRPCError } from "@trpc/server";
import jsonSchemaToZod from "json-schema-to-zod";
import * as z from "zod";

import { FormSchemaValidator } from "@forge/consts/knight-hacks";
import { db } from "@forge/db/client";
import { FormsSchemas } from "@forge/db/schemas/knight-hacks";

import { adminProcedure, publicProcedure } from "../trpc";
import { generateJsonSchema } from "../utils";
import { desc, eq, lt } from "drizzle-orm";

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

  updateForm: adminProcedure
    .input(z.object({
      oldName: z.string(),
      newName: z.string().min(1)
    })
  )
    .mutation(async ({ input }) => {

      const duplicateForm = await db.query.FormsSchemas.findFirst({
        where: (t, { eq }) => eq(t.name, input.newName),
      });

      if (duplicateForm){
        throw new TRPCError({
          message: "Form with this name already exists",
          code: "CONFLICT",
        });
      }

      const newFormName = await db.update(FormsSchemas)
        .set({name: input.newName})
        .where(eq(FormsSchemas.name, input.oldName))
        .returning({ name: FormsSchemas.name });

        if (newFormName.length === 0) {
          throw new TRPCError({
            message: "Form not found",
            code: "NOT_FOUND",
          });
        }

        return { success: true}

    }),



  deleteForm: adminProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input }) => {
      const deletion = await db.delete(FormsSchemas)
        .where(eq(FormsSchemas.name, input.name))
        .returning({ name: FormsSchemas.name });

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
      })
    )
    .query(async ({ input }) => {
      const { cursor } = input;
      const limit = input.limit;

      const forms = await db.query.FormsSchemas.findMany({
        limit: limit + 1,
       
        where: cursor ? lt(FormsSchemas.createdAt, new Date(cursor)) : undefined,
        orderBy: [desc(FormsSchemas.name)],
        columns: {
          name: true,
          createdAt: true,
        },
      });

      let nextCursor: string | undefined = undefined;

      if (forms.length > limit) {
        const nextItem = forms.pop();
        nextCursor = nextItem?.name;
      }

      return {
        forms,
        nextCursor,
      };
    }),


};
