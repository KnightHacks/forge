import {
  analyticsExportInputSchema,
  analyticsReportInputSchema,
} from "@forge/validators";

import { createTRPCRouter, permProcedure } from "../trpc";
import { requireClubAnalyticsRead } from "../utils/analytics/access";
import { getClubAnalyticsReport } from "../utils/analytics/club-report";
import { getDiscordAnalyticsReport } from "../utils/analytics/discord-report";
import { buildAnalyticsExportFile } from "../utils/analytics/export-file";
import { createAdminAuditEvent } from "../utils/audit/service";

export const analyticsRouter = createTRPCRouter({
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
