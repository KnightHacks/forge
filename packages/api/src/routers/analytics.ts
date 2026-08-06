import { z } from "zod";

import {
  analyticsExportInputSchema,
  analyticsReportInputSchema,
  hackathonAnalyticsExportInputSchema,
  hackathonAnalyticsReportInputSchema,
  resumeBundlePreviewInputSchema,
} from "@forge/validators";

import {
  previewHackathonResumeBundle,
  previewMemberResumeBundle,
} from "../resume-bundle.server";
import { createTRPCRouter, permProcedure } from "../trpc";
import {
  requireClubAnalyticsRead,
  requireHackathonAnalyticsIdentifiedRead,
  requireHackathonAnalyticsRead,
} from "../utils/analytics/access";
import { getClubAnalyticsReport } from "../utils/analytics/club-report";
import { getDiscordAnalyticsReport } from "../utils/analytics/discord-report";
import { buildAnalyticsExportFile } from "../utils/analytics/export-file";
import {
  buildHackathonAnalyticsExportFile,
  getHackathonAnalyticsIdentifiedRows,
  getHackathonAnalyticsReport,
  getHackerAnalyticsProfile,
  listHackathonAnalyticsOptions,
} from "../utils/analytics/hackathon-report.server";
import { createAdminAuditEvent } from "../utils/audit/service";

export const analyticsRouter = createTRPCRouter({
  /** Validates resume objects on demand and returns only aggregate part plans. */
  previewResumeBundle: permProcedure
    .input(resumeBundlePreviewInputSchema)
    .query(({ ctx, input }) =>
      input.scope === "club"
        ? previewMemberResumeBundle({ actor: ctx.session.user, ...input })
        : previewHackathonResumeBundle({ actor: ctx.session.user, ...input }),
    ),
  /** Lists explicit Hackathon IDs and deterministic active/past/future defaults. */
  listHackathonOptions: permProcedure.query(({ ctx }) => {
    requireHackathonAnalyticsRead(ctx);
    return listHackathonAnalyticsOptions();
  }),

  /** Returns aggregate Hack analytics only; no person or operator identity. */
  getHackathonReport: permProcedure
    .input(hackathonAnalyticsReportInputSchema)
    .query(({ ctx, input }) => {
      requireHackathonAnalyticsRead(ctx);
      return getHackathonAnalyticsReport(input);
    }),

  /** Returns the separately authorized identified points rows. */
  getHackathonIdentifiedRows: permProcedure
    .input(hackathonAnalyticsReportInputSchema)
    .query(({ ctx, input }) => {
      requireHackathonAnalyticsIdentifiedRead(ctx);
      return getHackathonAnalyticsIdentifiedRows(input);
    }),

  /** Returns an immutable, allowlisted analytical profile scoped to one Hack. */
  getHackerAnalyticsProfile: permProcedure
    .input(z.object({ attendeeId: z.uuid(), hackathonId: z.uuid() }).strict())
    .query(({ ctx, input }) => {
      requireHackathonAnalyticsIdentifiedRead(ctx);
      return getHackerAnalyticsProfile(input);
    }),

  /** Exports aggregate Hack analytics with a kind-specific disclosure policy. */
  exportHackathonReport: permProcedure
    .input(hackathonAnalyticsExportInputSchema)
    .query(async ({ ctx, input }) => {
      if (input.kind === "points_leaderboard") {
        requireHackathonAnalyticsIdentifiedRead(ctx);
      } else {
        requireHackathonAnalyticsRead(ctx);
      }
      const file = await buildHackathonAnalyticsExportFile(input);
      await createAdminAuditEvent({
        actionKey: "analytics.report.exported",
        actor: ctx.session.user,
        metadata: {
          eventIds: input.report.eventId ? [input.report.eventId] : [],
          hackathonId: input.report.hackathonId,
          kind: `hackathon_${input.kind}`,
          rowCount: file.rowCount,
        },
        subjects: [
          {
            relation: "primary",
            targetId: input.report.hackathonId,
            targetLabel: `${input.kind} hackathon analytics report`,
            targetType: "analytics_report",
          },
        ],
      });
      return file;
    }),

  /** Returns Discord aggregates plus matched Member-level counts, never message records or bodies. */
  getDiscordReport: permProcedure
    .input(analyticsReportInputSchema)
    .query(async ({ ctx, input }) => {
      requireClubAnalyticsRead(ctx);
      return getDiscordAnalyticsReport(input);
    }),

  /** Returns complete read-only Club analytics; source rows are never exposed. */
  getReport: permProcedure
    .input(analyticsReportInputSchema)
    .query(async ({ ctx, input }) => {
      requireClubAnalyticsRead(ctx);
      return getClubAnalyticsReport(input);
    }),

  /** Returns an internal section CSV or a separately privacy-reduced sponsor CSV. */
  exportReport: permProcedure
    .input(analyticsExportInputSchema)
    .query(async ({ ctx, input }) => {
      requireClubAnalyticsRead(ctx);
      const { kind, ...reportInput } = input;
      const file = await buildAnalyticsExportFile(input);
      await createAdminAuditEvent({
        actionKey: "analytics.report.exported",
        actor: ctx.session.user,
        metadata: {
          dateFrom:
            reportInput.period.kind === "custom"
              ? reportInput.period.from.toISOString()
              : null,
          dateTo:
            reportInput.period.kind === "custom"
              ? reportInput.period.to.toISOString()
              : null,
          eventIds:
            kind === "discord"
              ? []
              : reportInput.eventId
                ? [reportInput.eventId]
                : [],
          kind,
          rowCount: Math.max(0, file.content.split(/\r?\n/).length - 1),
        },
        subjects: [
          {
            relation: "primary",
            targetId: kind,
            targetLabel:
              kind === "discord"
                ? "Discord analytics summary"
                : `${kind} analytics report`,
            targetType: "analytics_report",
          },
        ],
      });
      return file;
    }),
});
