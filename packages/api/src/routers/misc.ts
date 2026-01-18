import type { TRPCRouterRecord } from "@trpc/server";
import { Routes } from "discord-api-types/v10";
import { z } from "zod";

import { RECRUITING_CHANNEL, TEAM_MAP } from "@forge/consts/knight-hacks";

import { protectedProcedure } from "../trpc";
import { discord, sendEmail } from "../utils";

// Miscellaneous routes (primarily for form integrations)
export const miscRouter = {
  recruitingUpdate: protectedProcedure
    .meta({
      id: "recruitingUpdate",
      inputSchema: z.object({
        name: z.string().min(1),
        email: z.string().email(),
        major: z.string().min(1),
        gradTerm: z.string().min(1),
        gradYear: z.number().min(1),
        team: z.string().min(1),
      }),
    })
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        major: z.string().min(1),
        gradTerm: z.string().min(1),
        gradYear: z.number().min(1),
        team: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const team = TEAM_MAP.find((team) => team.team === input.team);
      if (!team) {
        throw new Error("Team not found");
      }

      const directorRole = team.director_role;

      // Convert hex color string to integer for Discord API
      const colorInt = parseInt(team.color.replace("#", ""), 16);

      await discord.post(Routes.channelMessages(RECRUITING_CHANNEL), {
        body: {
          content: `<@&${directorRole}> **New Applicant for ${team.team}!**`,
          embeds: [
            {
              title: `${input.name}'s Application`,
              description: `A new applicant is interested in joining the **${team.team}** team.\n\nPlease see details below:`,
              color: colorInt,
              fields: [
                {
                  name: "Name",
                  value: input.name,
                  inline: true,
                },
                {
                  name: "Email",
                  value: input.email,
                  inline: true,
                },
                {
                  name: "Major",
                  value: input.major,
                  inline: true,
                },
                {
                  name: "Grad Term",
                  value: input.gradTerm,
                  inline: true,
                },
                {
                  name: "Grad Year",
                  value: input.gradYear.toString(),
                  inline: true,
                },
                {
                  name: "Team",
                  value: team.team,
                  inline: true,
                },
              ],
              footer: {
                text: `Submitted at: ${new Date().toLocaleString()}`,
              },
              timestamp: new Date().toISOString(),
            },
          ],
        },
      });
    }),

    fundingRequest: protectedProcedure
    .meta({
      id: "fundingRequest",
      inputSchema: z.object({
        team: z.string().min(1),
        description: z.string(),
        amount: z.number(),
        itemization: z.string(),
        importance: z.number(),
        dateNeeded: z.date(),
        deadlineType: z.string(),
      }),
    })
    .input(
      z.object({
        team: z.string().min(1),
        description: z.string(),
        amount: z.number(),
        itemization: z.string(),
        importance: z.number(),
        dateNeeded: z.date(),
        deadlineType: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      // Helper function to escape HTML and preserve newlines
      const formatText = (text: string | null | undefined): string => {
        if (!text) return "N/A";
        return text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;")
          .replace(/\n/g, "<br>");
      };

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; line-height: 1.6; color: #333333;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 20px 0;">
            <tr>
              <td align="center">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-width: 600px;">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 32px 40px 24px 40px; border-bottom: 1px solid #e5e5e5;">
                      <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a1a; letter-spacing: -0.5px;">
                        Funding Request
                      </h1>
                      <p style="margin: 8px 0 0 0; font-size: 14px; color: #666666;">
                        A new funding request has been submitted for the <strong style="color: #1a1a1a;">${input.team}</strong> team
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 32px 40px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="padding-bottom: 16px; vertical-align: top; width: 140px;">
                            <strong style="color: #1a1a1a; font-size: 14px;">Team:</strong>
                          </td>
                          <td style="padding-bottom: 16px; color: #333333; font-size: 14px;">
                            ${input.team}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 16px; vertical-align: top;">
                            <strong style="color: #1a1a1a; font-size: 14px;">Amount:</strong>
                          </td>
                          <td style="padding-bottom: 16px; color: #059669; font-size: 16px; font-weight: 600;">
                            $${input.amount.toLocaleString()}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 16px; vertical-align: top;">
                            <strong style="color: #1a1a1a; font-size: 14px;">Date Needed:</strong>
                          </td>
                          <td style="padding-bottom: 16px; color: #333333; font-size: 14px;">
                            ${input.dateNeeded.toLocaleDateString("en-US", { 
                              year: "numeric", 
                              month: "long", 
                              day: "numeric" 
                            })}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 16px; vertical-align: top;">
                            <strong style="color: #1a1a1a; font-size: 14px;">Importance:</strong>
                          </td>
                          <td style="padding-bottom: 16px;">
                            <span style="display: inline-block; background-color: #eff6ff; color: #1e40af; padding: 4px 12px; border-radius: 4px; font-size: 14px; font-weight: 500;">
                              ${input.importance}/10
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 16px; vertical-align: top;">
                            <strong style="color: #1a1a1a; font-size: 14px;">Deadline Type:</strong>
                          </td>
                          <td style="padding-bottom: 16px; color: #333333; font-size: 14px;">
                            ${input.deadlineType || "N/A"}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 8px; vertical-align: top; padding-top: 8px; border-top: 1px solid #e5e5e5;">
                            <strong style="color: #1a1a1a; font-size: 14px;">Description:</strong>
                          </td>
                          <td style="padding-bottom: 8px; padding-top: 8px; border-top: 1px solid #e5e5e5; color: #333333; font-size: 14px; white-space: pre-wrap;">
                            ${formatText(input.description)}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 16px; vertical-align: top; padding-top: 16px;">
                            <strong style="color: #1a1a1a; font-size: 14px;">Itemization:</strong>
                          </td>
                          <td style="padding-bottom: 16px; padding-top: 16px; color: #333333; font-size: 14px; white-space: pre-wrap;">
                            ${formatText(input.itemization)}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e5e5; border-radius: 0 0 8px 8px;">
                      <p style="margin: 0; font-size: 12px; color: #999999; text-align: center;">
                        Submitted at ${new Date().toLocaleString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true
                        })}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `.trim();

      await sendEmail({
        to: "treasurer@knighthacks.org",
        subject: `KHFR - $${input.amount.toLocaleString()} | ${input.dateNeeded.toLocaleDateString()} | ${input.team}`,
        html: htmlContent,
        from: "funding-requests@knighthacks.org",
      });
    }),
} satisfies TRPCRouterRecord;
