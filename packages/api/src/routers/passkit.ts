import fs from "fs";
import path from "path";
import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { PKPass } from "passkit-generator";

import { db } from "@forge/db/client";

import { env } from "../env";
import { protectedProcedure } from "../trpc";

export const passkitRouter = {
  generatePass: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      // Get member data
      const member = await db.query.Member.findFirst({
        where: (t, { eq }) => eq(t.userId, ctx.session.user.id),
      });

      if (!member) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found",
        });
      }

      // Get base64 certs from env
      // zod guarantees these are strings
      const wwdrCertStr = env.WWDR_CERT_BASE64;
      const signerCertStr = env.SIGNER_CERT_BASE64;
      const signerKeyStr = env.SIGNER_KEY_BASE64;
      const signerKeyPassStr = env.SIGNER_KEY_PASS_BASE64;

      if (!wwdrCertStr || !signerCertStr || !signerKeyStr) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Missing certificate environment variables.",
        });
      }
      // Decode PEMs from base64 (including headers/footers)
      const wwdrCertBuffer = Buffer.from(wwdrCertStr, "base64");
      const signerCertBuffer = Buffer.from(signerCertStr, "base64");
      const signerKeyBuffer = Buffer.from(signerKeyStr, "base64");
      const signerKeyPassBuffer = Buffer.from(signerKeyPassStr, "base64");

      // The passDir is still needed for the pass model assets
      let projectRoot = process.cwd();
      if (projectRoot.includes(".next") || projectRoot.includes("apps/")) {
        while (
          !fs.existsSync(path.join(projectRoot, "package.json")) ||
          !fs.existsSync(path.join(projectRoot, "packages"))
        ) {
          const parent = path.dirname(projectRoot);
          if (parent === projectRoot) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message:
                "Could not find monorepo root. Please check your project structure.",
            });
          }
          projectRoot = parent;
        }
      }
      const passDir = path.join(
        projectRoot,
        "packages/transactional/passes/member.pass",
      );

      const pass = await PKPass.from(
        {
          model: passDir,
          certificates: {
            wwdr: wwdrCertBuffer,
            signerCert: signerCertBuffer,
            signerKey: signerKeyBuffer,
            signerKeyPassphrase: signerKeyPassBuffer.toString("utf-8"),
          },
        },
        {
          serialNumber: member.id,
          passTypeIdentifier: env.PASS_TYPE_IDENTIFIER,
          teamIdentifier: env.TEAM_IDENTIFIER,
        },
      );

      // Set pass fields with actual member data using the proper API
      // Clear existing fields and add new ones
      pass.primaryFields.length = 0;
      pass.primaryFields.push({
        key: "accessType",
        label: "General Access",
        value: "Event Entry Pass",
        textAlignment: "PKTextAlignmentCenter",
      });

      pass.secondaryFields.length = 0;
      pass.secondaryFields.push({
        key: "instructions",
        label: "Member Since",
        value: new Date(member.dateCreated).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        textAlignment: "PKTextAlignmentCenter",
      });

      pass.auxiliaryFields.length = 0;
      pass.auxiliaryFields.push(
        {
          key: "name",
          label: "NAME",
          value: `${member.firstName} ${member.lastName}`,
          textAlignment: "PKTextAlignmentCenter",
        },
        {
          key: "discord",
          label: "DISCORD",
          value: member.discordUser,
          textAlignment: "PKTextAlignmentCenter",
        },
      );

      // Set locations for relevance using the proper method
      pass.setLocations({
        longitude: -81.198766,
        latitude: 28.601837,
        relevantText: "University of Central Florida",
      });

      // Set barcodes with QR code data
      pass.setBarcodes({
        message: `user:${ctx.session.user.id}`,
        format: "PKBarcodeFormatQR",
        messageEncoding: "iso-8859-1",
        altText: "Scan to Check In",
      });

      // Get pass as buffer directly
      const buffer = pass.getAsBuffer();
      const base64Data = buffer.toString("base64");
      const fileName = `knight-hacks-pass-${member.id}.pkpass`;

      return {
        success: true,
        passBuffer: base64Data,
        fileName: fileName,
      };
    } catch (error) {
      console.error("Error generating passkit pass:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to generate passkit pass: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  }),
} satisfies TRPCRouterRecord;
