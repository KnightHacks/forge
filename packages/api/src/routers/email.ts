import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";

import { sendEmail } from "@forge/email";
import { logger, permissions } from "@forge/utils";

import { permProcedure } from "../trpc";

export const emailRouter = {
  sendEmail: permProcedure
    .input(
      z.object({
        to: z.string().email(),
        subject: z.string().min(1),
        template_id: z.number(),
        from: z.string().min(1),
        data: z.record(z.string(), z.string()),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      permissions.controlPerms.or(["EMAIL_PORTAL"], ctx);
      logger.log(input.data);
      try {
        const response = await sendEmail({
          to: input.to,
          subject: input.subject,
          from: input.from,
          template_id: input.template_id,
          data: input.data,
        });

        return response;
      } catch (error) {
        logger.error("Error sending email:", {
          error: error instanceof Error ? error.message : error,
          input,
        });
        throw new Error(
          `Failed to send email: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          { cause: error },
        );
      }
    }),
} satisfies TRPCRouterRecord;
