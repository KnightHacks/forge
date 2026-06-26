import { env } from "~/env";

const DEFAULT_DEBUG_LATENCY_MS = 2500;
const MAX_DEBUG_LATENCY_MS = 5000;

function firstSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function getMemberDebugLatencyMs(
  searchParams: Record<string, string | string[] | undefined>,
) {
  if (env.NODE_ENV === "production") return 0;

  const rawValue =
    firstSearchParamValue(searchParams.latency) ??
    firstSearchParamValue(searchParams.debugLatency);

  if (!rawValue) return 0;
  if (rawValue === "true") return DEFAULT_DEBUG_LATENCY_MS;

  const parsedValue = Number(rawValue);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) return 0;

  return Math.min(Math.round(parsedValue), MAX_DEBUG_LATENCY_MS);
}
