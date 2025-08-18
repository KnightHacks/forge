import fs from "fs";
import path from "path";
import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { PKPass } from "passkit-generator";

import { db } from "@forge/db/client";

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

      // Check if member has paid dues
      const duesPaid = await db.query.DuesPayment.findFirst({
        where: (t, { eq }) => eq(t.memberId, member.id),
      });

      // Set up paths for required files using a more robust path resolution method
      // In monorepos, we need to find the actual project root
      let projectRoot = process.cwd();

      // If we're running from a Next.js app, we need to go up to the monorepo root
      if (projectRoot.includes(".next") || projectRoot.includes("apps/")) {
        // Navigate up to find the monorepo root (where package.json with workspaces is)
        while (
          !fs.existsSync(path.join(projectRoot, "package.json")) ||
          !fs.existsSync(path.join(projectRoot, "packages"))
        ) {
          const parent = path.dirname(projectRoot);
          if (parent === projectRoot) {
            // We've reached the filesystem root, something is wrong
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message:
                "Could not find monorepo root. Please check your project structure.",
            });
          }
          projectRoot = parent;
        }
      }

      const passDir = path.join(projectRoot, "packages/api/simple.pass");
      const wwdrPath = path.join(projectRoot, "packages/api/cert/wwdr.pem");
      const signerCertPath = path.join(
        projectRoot,
        "packages/api/cert/signerCert.pem",
      );
      const signerKeyPath = path.join(
        projectRoot,
        "packages/api/cert/signerKey.pem",
      );

      // Check if directories exist
      if (!fs.existsSync(path.dirname(wwdrPath))) {
        console.log("Cert directory doesn't exist:", path.dirname(wwdrPath));
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Certificate directory not found: ${path.dirname(wwdrPath)}`,
        });
      }

      // list files in the cert directory
      try {
        const files = fs.readdirSync(path.dirname(wwdrPath));
        console.log("Files in cert directory:", files);
      } catch (dirError) {
        console.log("Error reading cert directory:", dirError);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Could not read certificate directory: ${String(dirError)}`,
        });
      }

      // Read the files
      const wwdrCertBuffer = fs.readFileSync(wwdrPath);

      const signerCertBuffer = fs.readFileSync(signerCertPath);
      const signerKeyBuffer = fs.readFileSync(signerKeyPath);

      const pass = await PKPass.from(
        {
          model: passDir, // This is the path to the pass directory
          certificates: {
            wwdr: wwdrCertBuffer,
            signerCert: signerCertBuffer,
            signerKey: signerKeyBuffer,
            signerKeyPassphrase: "knighthacks",
          },
        },
        {
          serialNumber: member.id,
        },
      );

      // Set pass fields with actual member data using the proper API
      // Clear existing fields and add new ones
      pass.primaryFields.length = 0;
      pass.primaryFields.push({
        key: "accessType",
        label: "General Access",
        value: "Event Entry Pass",
        textAlignment: "PKTextAlignmentCenter"
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
        textAlignment: "PKTextAlignmentCenter"
      });

      pass.auxiliaryFields.length = 0;
      pass.auxiliaryFields.push(
        {
          key: "name",
          label: "NAME",
          value: `${member.firstName} ${member.lastName}`,
          textAlignment: "PKTextAlignmentCenter"
        },
        {
          key: "discord",
          label: "DISCORD",
          value: member.discordUser,
          textAlignment: "PKTextAlignmentCenter"
        }
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
        message: "Failed to generate passkit pass",
      });
    }
  }),
} satisfies TRPCRouterRecord;
