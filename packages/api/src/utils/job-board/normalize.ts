import { createHash } from "node:crypto";

import { normalizeCompanyName } from "@forge/validators";

// Ported from CS Job Poster `utils/normalization.py` and
// `utils/feed_normalization.py` (#633). Identity is strict: only employer
// requisition IDs, the apply URL, or the source's own ID ever link listings.

const TRACKING_QUERY_KEYS = new Set([
  "ref",
  "referrer",
  "source",
  "gh_src",
  "gh_source",
]);

/** Hosts that wrap an employer's application page rather than host it. */
const AGGREGATOR_HOSTS = new Set([
  "jobright.ai",
  "www.jobright.ai",
  "simplify.jobs",
  "www.simplify.jobs",
  "speedyapply.com",
  "www.speedyapply.com",
]);

/**
 * Canonical apply URL: https/http only, lowercase host, no fragment, no
 * tracking params, no duplicate or trailing slashes, no trailing `/apply`.
 * Returns null for anything that isn't an http(s) URL.
 */
export function cleanApplyUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;

  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    const lowered = key.toLowerCase();
    if (TRACKING_QUERY_KEYS.has(lowered) || lowered.startsWith("utm_")) {
      url.searchParams.delete(key);
    }
  }
  url.searchParams.sort();

  let path = url.pathname.replace(/\/{2,}/g, "/").replace(/\/+$/, "");
  if (path.toLowerCase().endsWith("/apply")) path = path.slice(0, -6);
  url.pathname = path || "/";

  return url.toString();
}

export function isAggregatorUrl(url: string) {
  try {
    return AGGREGATOR_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Keep a direct employer link over an aggregator copy; otherwise take the newest. */
export function preferredApplyUrl(existing: string, candidate: string) {
  return isAggregatorUrl(candidate) && !isAggregatorUrl(existing)
    ? existing
    : candidate;
}

/** Employer requisition keys an apply URL proves, strongest first. */
function atsKeys(url: URL): string[] {
  const host = url.hostname;
  const parts = url.pathname
    .split("/")
    .filter((part) => part && part.toLowerCase() !== "apply");
  const keys: string[] = [];

  const ghJid = url.searchParams.get("gh_jid");
  if (ghJid) keys.push(`ats:greenhouse:${ghJid}`);
  if (host.endsWith("greenhouse.io")) {
    const jobId = parts[parts.indexOf("jobs") + 1];
    if (parts.includes("jobs") && jobId) keys.push(`ats:greenhouse:${jobId}`);
  }
  if ((host === "jobs.lever.co" || host === "jobs.eu.lever.co") && parts[1]) {
    keys.push(`ats:lever:${parts[1].toLowerCase()}`);
  }
  if (host === "jobs.ashbyhq.com" && parts[1]) {
    keys.push(`ats:ashby:${parts[1].toLowerCase()}`);
  }
  if (
    host.includes("myworkdayjobs.com") ||
    host.includes("myworkdaysite.com")
  ) {
    const tenant = host.split(".")[0];
    const requisition = parts.at(-1)?.split("_").at(-1)?.toLowerCase();
    if (tenant && requisition) {
      keys.push(`ats:workday:${tenant}:${requisition}`);
    }
  }
  return [...new Set(keys)];
}

/**
 * Every identity a listing can be matched by, strongest first. The first entry
 * becomes a new job's `identityKey`; lookups try all of them.
 */
export function identityKeys(input: {
  applyUrl: string;
  provider: string;
  boardKey: string;
  externalId: string;
}): string[] {
  const keys = atsKeys(new URL(input.applyUrl));
  // An aggregator URL wraps someone else's posting, so it identifies nothing.
  if (!isAggregatorUrl(input.applyUrl)) keys.push(`url:${input.applyUrl}`);
  keys.push(`source:${input.provider}:${input.boardKey}:${input.externalId}`);
  return keys;
}

/**
 * SHA-256 hex of the UTF-8 key: the same value as the generated `*_hash`
 * columns in `@forge/db` job-board tables.
 */
export function identityHash(key: string) {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

/** Grouping key for a company label; falls back to the raw label when it has no ASCII. */
export function companyKey(label: string) {
  const normalized = normalizeCompanyName(label) || label.trim().toLowerCase();
  return normalized.slice(0, 120);
}
