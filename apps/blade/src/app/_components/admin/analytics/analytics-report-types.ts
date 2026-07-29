import type { RouterOutputs } from "@forge/api";

/** The Club analytics report every analytics surface renders from. */
export type AnalyticsReport = RouterOutputs["analytics"]["getReport"];

/** The Discord half of the same report, read separately by the API. */
export type DiscordAnalyticsReport =
  RouterOutputs["analytics"]["getDiscordReport"];
