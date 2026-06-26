import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure } from "../trpc";
import {
  codeOwnedFormConfigs,
  formResponseCallbacks,
} from "../utils/forms/config";
import {
  createResponse,
  createResponseInputSchema,
  getFormBySlug,
} from "../utils/forms/manager";

export const formsRouter = {
  getForm: protectedProcedure
    .input(z.object({ slugName: z.string() }))
    .query(async ({ input }) => {
      return await getFormBySlug({
        codeOwnedForms: codeOwnedFormConfigs,
        slugName: input.slugName,
      });
    }),

  createResponse: protectedProcedure
    .input(createResponseInputSchema)
    .mutation(async ({ ctx, input }) => {
      return await createResponse({
        callbacks: formResponseCallbacks,
        codeOwnedForms: codeOwnedFormConfigs,
        input,
        session: ctx.session,
      });
    }),
} satisfies TRPCRouterRecord;
