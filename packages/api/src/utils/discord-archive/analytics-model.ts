export interface DiscordAnalyticsMixRow extends Record<string, unknown> {
  count: number;
  kind: "bot" | "human" | "system" | "webhook";
}

export interface DiscordAnalyticsChannelRow extends Record<string, unknown> {
  count: number;
  isThread: boolean;
  name: string;
  type: number;
}

function ratio(numerator: number, denominator: number) {
  return denominator === 0 ? null : numerator / denominator;
}

export function buildDiscordAnalyticsMix(
  rows: DiscordAnalyticsMixRow[],
  messageCount: number,
) {
  const labels = {
    bot: "Bots",
    human: "People",
    system: "System",
    webhook: "Webhooks",
  } as const;

  return (["human", "bot", "webhook", "system"] as const).map((kind) => {
    const count = rows.find((candidate) => candidate.kind === kind)?.count ?? 0;
    return {
      count,
      kind,
      label: labels[kind],
      share: ratio(count, messageCount),
    };
  });
}

export function buildDiscordChannelDistribution(
  rows: DiscordAnalyticsChannelRow[],
  messageCount: number,
) {
  return rows.map((row) => ({
    count: row.count,
    isThread: row.isThread,
    label: row.name,
    share: ratio(row.count, messageCount),
    type: row.type,
  }));
}
