import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";

import { logger } from "@forge/utils";

import { getUserQRCodeDataUrl } from "../services/qr-code";
import { protectedProcedure } from "../trpc";

function getQRCodeErrorMessage(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return "Failed to load the QR code.";
  }

  const { code } = error as { code?: unknown };

  if (
    code === "AccessDenied" ||
    code === "InvalidAccessKeyId" ||
    code === "SignatureDoesNotMatch"
  ) {
    return "QR code storage authentication failed.";
  }

  if (code === "NoSuchBucket") {
    return "QR code storage bucket is unavailable.";
  }

  if (
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "ETIMEDOUT" ||
    code === "ECONNRESET"
  ) {
    return "QR code storage endpoint is unavailable.";
  }

  return "Failed to load the QR code.";
}

export const qrRouter = {
  getQRCode: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    try {
      const qrCodeUrl = await getUserQRCodeDataUrl(userId);

      return { qrCodeUrl };
    } catch (error) {
      logger.error("Failed to load the QR code:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: getQRCodeErrorMessage(error),
      });
    }
  }),
} satisfies TRPCRouterRecord;
