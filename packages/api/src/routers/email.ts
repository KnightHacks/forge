import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";

import { permissions } from "@forge/utils";

import { permProcedure } from "../trpc";
import { sendEmail } from "../utils";

export const emailRouter = {
  sendEmail: permProcedure
    .input(
      z.object({
        to: z.string().email(),
        subject: z.string().min(1),
        template_id: z.number(),
        from: z.string().min(1),
        data: z.record(z.string()),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      permissions.controlPerms.or(["EMAIL_PORTAL"], ctx);
      console.log(input.data);
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
        console.error("Error sending email:", {
          error: error instanceof Error ? error.message : error,
          input,
        });
        throw new Error(
          `Failed to send email: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        );
      }
    }),
} satisfies TRPCRouterRecord;
