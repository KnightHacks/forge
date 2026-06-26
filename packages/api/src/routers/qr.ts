import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import QRCode from "qrcode";

import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Member } from "@forge/db/schemas/knight-hacks";
import { logger } from "@forge/utils";

import { protectedProcedure } from "../trpc";

export const qrRouter = {
  getQRCode: protectedProcedure.query(async ({ ctx }) => {
    const member = await db.query.Member.findFirst({
      where: eq(Member.userId, ctx.session.user.id),
      columns: {
        id: true,
      },
    });

    if (!member) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Create a member profile before viewing your QR code.",
      });
    }

    try {
      return {
        qrCodeUrl: await QRCode.toDataURL(ctx.session.user.id, {
          errorCorrectionLevel: "M",
          margin: 1,
          type: "image/png",
          width: 512,
        }),
      };
    } catch (error) {
      logger.error("Failed to generate member QR code:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not generate your QR code.",
      });
    }
  }),
} satisfies TRPCRouterRecord;
