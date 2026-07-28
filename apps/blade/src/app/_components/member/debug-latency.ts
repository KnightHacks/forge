import type { SearchParams } from "~/lib/search-params";
import { env } from "~/env";
import { first } from "~/lib/search-params";

const DEFAULT_DEBUG_LATENCY_MS = 2500;
const MAX_DEBUG_LATENCY_MS = 5000;

export function getMemberDebugLatencyMs(searchParams: SearchParams) {
  if (env.NODE_ENV === "production") return 0;

  const rawValue =
    first(searchParams.latency) ?? first(searchParams.debugLatency);

  if (!rawValue) return 0;
  if (rawValue === "true") return DEFAULT_DEBUG_LATENCY_MS;

  const parsedValue = Number(rawValue);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) return 0;

  return Math.min(Math.round(parsedValue), MAX_DEBUG_LATENCY_MS);
}
