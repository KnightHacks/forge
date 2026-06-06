import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Hackathon } from "@forge/db/schemas/knight-hacks";
import { sendEmail, sendHackathonEmail } from "@forge/email";
import { HACKATHON_EMAIL_KINDS } from "@forge/email/hackathons";
import { logger, permissions } from "@forge/utils";

import { permProcedure } from "../trpc";

export const emailRouter = {
  sendHackathonEmail: permProcedure
    .input(
      z.object({
        data: z.record(z.string(), z.string()).optional(),
        from: z.string().min(1).optional(),
        hackathonName: z.string().min(1),
        kind: z.enum(HACKATHON_EMAIL_KINDS),
        recipientName: z.string().min(1),
        to: z.string().email(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      permissions.controlPerms.or(["EMAIL_PORTAL"], ctx);

      const hackathon = await db.query.Hackathon.findFirst({
        where: eq(Hackathon.name, input.hackathonName),
      });

      if (!hackathon) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Hackathon not found: ${input.hackathonName}`,
        });
      }

      return sendHackathonEmail({
        data: input.data,
        from: input.from,
        hackathon: {
          applicationBackgroundKey: hackathon.applicationBackgroundKey,
          displayName: hackathon.displayName,
          emailTemplateKey: hackathon.emailTemplateEnabled
            ? hackathon.emailTemplateKey
            : null,
          routeName: hackathon.name,
          theme: hackathon.theme,
        },
        kind: input.kind,
        recipient: {
          name: input.recipientName,
          to: input.to,
        },
      });
    }),

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
