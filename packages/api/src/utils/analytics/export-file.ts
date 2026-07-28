import type { AnalyticsExportInput } from "@forge/validators";

import { getClubAnalyticsReport } from "./club-report";
import { getDiscordAnalyticsReport } from "./discord-report";
import {
  serializeInternalAnalyticsCsv,
  serializeSponsorAnalyticsCsv,
} from "./export";
import {
  csvMetadata,
  discordCsvMetadata,
  discordRows,
  internalRows,
  sponsorMetrics,
} from "./export-rows";

const CSV_MIME_TYPE = "text/csv;charset=utf-8";

function safeFileToken(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "report"
  );
}

/**
 * Builds one downloadable analytics CSV. `sponsor` is a separate privacy policy
 * — suppressed aggregates only — not an alternate rendering of the internal
 * sections, so it never shares a row shaper with them.
 */
export async function buildAnalyticsExportFile(input: AnalyticsExportInput) {
  const { kind, ...reportInput } = input;

  if (kind === "discord") {
    const report = await getDiscordAnalyticsReport(reportInput);
    return {
      content: serializeInternalAnalyticsCsv({
        generatedAt: report.metadata.generatedAt,
        kind,
        metadata: discordCsvMetadata(report),
        rows: discordRows(report),
      }),
      fileName: `discord-analytics-summary-${safeFileToken(report.metadata.period.label)}.csv`,
      mimeType: CSV_MIME_TYPE,
    };
  }

  const report = await getClubAnalyticsReport(reportInput);
  const metadata = csvMetadata(report);
  return {
    content:
      kind === "sponsor"
        ? serializeSponsorAnalyticsCsv({
            audienceRows: Object.entries(report.audience.demographics).flatMap(
              ([demographic, dimension]) =>
                dimension.rows.map((row) => ({
                  attendeeCount: row.attendeeCount,
                  category: row.category,
                  demographic,
                  memberCount: row.baseCount,
                })),
            ),
            generatedAt: report.metadata.generatedAt,
            metadata,
            metrics: sponsorMetrics(report),
            suppressionThreshold: report.reports.sponsorSuppressionThreshold,
          })
        : serializeInternalAnalyticsCsv({
            generatedAt: report.metadata.generatedAt,
            kind,
            metadata,
            rows: internalRows(kind, report),
          }),
    fileName: `club-analytics-${kind}-${safeFileToken(report.metadata.period.label)}.csv`,
    mimeType: CSV_MIME_TYPE,
  };
}
