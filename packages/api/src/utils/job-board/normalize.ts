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
    // Only a posting URL ends in `<title>_<requisition>`; landing pages don't.
    const tenant = host.split(".")[0];
    const requisition = /_([a-z0-9-]*[0-9][a-z0-9-]*)$/i
      .exec(parts.at(-1) ?? "")?.[1]
      ?.toLowerCase();
    if (tenant && requisition) {
      keys.push(`ats:workday:${tenant}:${requisition}`);
    }
  }
  return [...new Set(keys)];
}

/** Query parameter names that carry a posting ID (`jobId`, `gh_jid`, `req`...). */
const POSTING_ID_PARAM =
  /(?:^|[_-])(?:j?id|req|requisition|posting)(?:$|[_-])|(?:job|req|posting)_?id$/i;

/**
 * Whether a URL points at one posting rather than a careers landing page that
 * many listings share. A posting URL carries an ID: a digit in its last path
 * segment or in a query value.
 */
function identifiesPosting(url: URL) {
  const last = url.pathname.split("/").filter(Boolean).at(-1) ?? "";
  return (
    /[0-9]/.test(last) ||
    [...url.searchParams].some(
      ([name, value]) => POSTING_ID_PARAM.test(name) && /[0-9]/.test(value),
    )
  );
}

/**
 * Every identity a listing can be matched by, strongest first. The first entry
 * becomes a new job's `identityKey`; lookups try all of them. The source key
 * is always last, so there is always at least one.
 */
export function identityKeys(input: {
  applyUrl: string;
  provider: string;
  boardKey: string;
  externalId: string;
}): [string, ...string[]] {
  const url = new URL(input.applyUrl);
  const keys: [string, ...string[]] = [
    // JSON keeps the parts apart even when a board key or ID contains ":".
    `source:${JSON.stringify([input.provider, input.boardKey, input.externalId])}`,
  ];
  // An aggregator URL wraps someone else's posting, and a landing page is
  // shared by many postings, so neither identifies a job.
  if (!isAggregatorUrl(input.applyUrl) && identifiesPosting(url)) {
    keys.unshift(`url:${input.applyUrl}`);
  }
  keys.unshift(...atsKeys(url));
  return keys;
}

/**
 * SHA-256 hex of the UTF-8 key: the same value as the generated `*_hash`
 * columns in `@forge/db` job-board tables.
 */
export function identityHash(key: string) {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

/**
 * Grouping key for a company label, valid for `companyKeySchema`. Empty when
 * the label has no ASCII letters or digits, which leaves nothing to group by.
 */
export function companyKey(label: string) {
  return normalizeCompanyName(label).slice(0, 120).trim();
}
