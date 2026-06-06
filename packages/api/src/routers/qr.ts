import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import QRCode from "qrcode";

import { logger } from "@forge/utils";

import { protectedProcedure } from "../trpc";

export const qrRouter = {
  getQRCode: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    try {
      const qrCodeUrl = await QRCode.toDataURL(`user:${userId}`, {
        type: "image/png",
      });

      return { qrCodeUrl };
    } catch (error) {
      logger.error("Failed to generate the QR code:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to generate the QR code.",
      });
    }
  }),
} satisfies TRPCRouterRecord;
