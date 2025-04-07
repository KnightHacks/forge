import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";

import { publicProcedure } from "../trpc";
import { gmail } from "../utils";

export const emailRouter = {
  sendEmail: publicProcedure
    .input(
      z.object({
        to: z.string().email(),
        subject: z.string().min(1),
        body: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // write email
        const rawMessage = [
          `To: ${input.to}`,
          "MIME-Version: 1.0", // needed for proper email formatting
          "Content-Type: text/plain; charset=utf-8", // specify content type
          `Subject: ${input.subject}`,
          "", // empty line between headers and body
          input.body,
        ].join("\n");

        // encode message properly for Gmail API
        const encodedMessage = Buffer.from(rawMessage)
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");

        // send email
        const response = await gmail.users.messages.send({
          userId: "me",
          requestBody: {
            raw: encodedMessage,
          },
        });

        return { success: true, messageId: response.data.id };
      } catch (error) {
        console.error("Error sending email:", {
          error: error instanceof Error ? error.message : error,
          input: input,
        });
        throw new Error(
          `Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }),
} satisfies TRPCRouterRecord;
