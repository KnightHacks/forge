import { serializeCsvRows } from "@forge/utils";

export interface AnalyticsCsvMetadata {
  comparisonLabel: string;
  filterLabel: string;
  metricVersion: string;
  periodLabel: string;
}

function serializeRows(headers: readonly string[], rows: readonly unknown[][]) {
  return serializeCsvRows([headers, ...rows]);
}

function metadataRows(
  metadata: AnalyticsCsvMetadata,
  generatedAt: Date,
): unknown[][] {
  return [
    ["metadata", "metric_version", metadata.metricVersion],
    ["metadata", "period", metadata.periodLabel],
    ["metadata", "comparison", metadata.comparisonLabel],
    ["metadata", "filters", metadata.filterLabel],
    ["metadata", "generated_at", generatedAt],
  ];
}

/** Serializes one approved internal analytics section with full analytical rows. */
export function serializeInternalAnalyticsCsv({
  generatedAt,
  kind,
  metadata,
  rows,
}: {
  generatedAt: Date;
  kind: "overview" | "events" | "discord" | "audience" | "dues";
  metadata: AnalyticsCsvMetadata;
  rows: readonly Record<string, unknown>[];
}) {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return serializeRows(
    ["record_type", "field", "value", ...columns],
    [
      ...metadataRows(metadata, generatedAt),
      ...rows.map((row) => [
        kind,
        "",
        "",
        ...columns.map((column) => row[column]),
      ]),
    ],
  );
}

export interface SponsorMetricRow {
  coverage: number | null;
  denominator: number | null;
  metric: string;
  numerator: number | null;
  value: number | null;
}

export interface SponsorAudienceRow {
  attendeeCount: number;
  category: string;
  demographic: string;
  memberCount: number;
}

function sponsorAudienceRows(
  rows: readonly SponsorAudienceRow[],
  threshold: number,
) {
  const safe: {
    attendeeCount: number | null;
    category: string;
    demographic: string;
    memberCount: number | null;
  }[] = [];
  const dimensions = new Map<string, SponsorAudienceRow[]>();
  rows.forEach((row) => {
    const dimensionRows = dimensions.get(row.demographic) ?? [];
    dimensionRows.push(row);
    dimensions.set(row.demographic, dimensionRows);
  });
  dimensions.forEach((dimensionRows, demographic) => {
    const totalMembers = dimensionRows.reduce(
      (sum, row) => sum + row.memberCount,
      0,
    );
    const totalAttendees = dimensionRows.reduce(
      (sum, row) => sum + row.attendeeCount,
      0,
    );
    const withheld: SponsorAudienceRow[] = [];
    dimensionRows.forEach((row) => {
      const sparse =
        row.memberCount < threshold ||
        row.attendeeCount < threshold ||
        totalMembers - row.memberCount < threshold ||
        totalAttendees - row.attendeeCount < threshold;
      (sparse ? withheld : safe).push(row);
    });
    if (withheld.length === 0) return;
    const attendeeCount = withheld.reduce(
      (sum, row) => sum + row.attendeeCount,
      0,
    );
    const memberCount = withheld.reduce((sum, row) => sum + row.memberCount, 0);
    const publishCombined =
      attendeeCount >= threshold && memberCount >= threshold;
    safe.push({
      attendeeCount: publishCombined ? attendeeCount : null,
      category: "Withheld / other",
      demographic,
      memberCount: publishCombined ? memberCount : null,
    });
  });
  return safe;
}

/** Serializes aggregate sponsor-safe metrics after deterministic suppression. */
export function serializeSponsorAnalyticsCsv({
  audienceRows,
  generatedAt,
  metadata,
  metrics,
  suppressionThreshold,
}: {
  audienceRows: readonly SponsorAudienceRow[];
  generatedAt: Date;
  metadata: AnalyticsCsvMetadata;
  metrics: readonly SponsorMetricRow[];
  suppressionThreshold: number;
}) {
  const rows: unknown[][] = [
    ...metadataRows(metadata, generatedAt),
    ["metadata", "suppression_threshold", suppressionThreshold],
    [
      "metadata",
      "suppression_reason",
      "Sparse or complementary demographic cells are combined",
    ],
    ...metrics.map((metric) => [
      "metric",
      metric.metric,
      metric.value,
      metric.numerator,
      metric.denominator,
      metric.coverage,
      "",
      "",
    ]),
    ...sponsorAudienceRows(audienceRows, suppressionThreshold).map((row) => [
      "audience",
      "audience_composition",
      row.attendeeCount,
      row.attendeeCount,
      row.memberCount,
      row.memberCount === null ||
      row.memberCount === 0 ||
      row.attendeeCount === null
        ? null
        : row.attendeeCount / row.memberCount,
      row.category,
      row.memberCount,
      row.demographic,
    ]),
  ];
  return serializeRows(
    [
      "record_type",
      "metric",
      "value",
      "numerator",
      "denominator",
      "coverage",
      "category",
      "member_count",
      "demographic",
    ],
    rows,
  );
}
