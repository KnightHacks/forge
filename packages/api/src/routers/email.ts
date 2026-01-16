import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";

import { permProcedure } from "../trpc";
import { controlPerms, sendEmail } from "../utils";

export const emailRouter = {
  sendEmail: permProcedure
    .input(
      z.object({
        to: z.string().email(),
        subject: z.string().min(1),
        body: z.string().min(1),
        from: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      controlPerms.or(["EMAIL_PORTAL"], ctx);
      try {
        const response = await sendEmail({
          to: input.to,
          subject: input.subject,
          html: input.body,
          from: input.from,
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
