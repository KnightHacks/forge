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
        from: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const alias = input.from;
      try {
        await gmail.users.settings.sendAs.create({
          userId: "me",
          requestBody: {
            sendAsEmail: alias,
            displayName: "KnightHacks",
            treatAsAlias: true,
            isDefault: false,
          },
        });
      } catch (err: any) {
        if (err.code !== 409) {
          console.error("Error creating sendAs alias:", err);
          throw new Error(`Could not add alias: ${err.message || err}`);
        }
      }

      try {
        const rawMessage = [
          `From: ${alias}`,
          `To: ${input.to}`,
          "MIME-Version: 1.0",
          "Content-Type: text/plain; charset=utf-8",
          `Subject: ${input.subject}`,
          "",
          input.body,
        ].join("\n");

        const encodedMessage = Buffer.from(rawMessage)
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");

        const response = await gmail.users.messages.send({
          userId: "me",
          requestBody: { raw: encodedMessage },
        });

        return { success: true, messageId: response.data.id };
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
