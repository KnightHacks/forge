import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";

import { publicProcedure } from "../trpc";
import { sendEmail } from "../utils";

export const emailRouter = {
  testEmail: publicProcedure
    .input(
      z.object({
        to: z.string().email(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const response = await sendEmail({
          to: input.to,
          subject: "Test Email from Knight Hacks",
          html: `
            <h1>Test Email</h1>
            <p>This is a test email to verify Resend integration is working.</p>
            <p>Sent at: ${new Date().toISOString()}</p>
          `,
        });

        return { success: true, messageId: response.messageId };
      } catch (error) {
        console.error("Test email error:", error);
        throw new Error(
          `Failed to send test email: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        );
      }
    }),

  sendEmail: publicProcedure
    .input(
      z.object({
        to: z.string().email(),
        subject: z.string().min(1),
        body: z.string().min(1),
        from: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
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
