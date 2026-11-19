import type { JOB_BOARD } from "@forge/consts";

import { findUsCity } from "../career/us-cities";

// U.S. scope rules ported from CS Job Poster `utils/feed_normalization.py`
// (`is_us_location`) and `utils/normalization.py` (`normalize_location`).

const STATE_CODES_BY_NAME: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "district of columbia": "DC",
};
const STATE_CODES = new Set(Object.values(STATE_CODES_BY_NAME));
const STATE_NAMES = Object.keys(STATE_CODES_BY_NAME).join("|");

const CITY_ALIASES: Record<string, { city: string; state: string }> = {
  nyc: { city: "New York", state: "NY" },
  sf: { city: "San Francisco", state: "CA" },
};

const EXPLICIT_US = new RegExp(
  String.raw`\bUnited States\b|\bUSA\b|\bNYC\b|\bSF\b|\b(?:${STATE_NAMES})\b`,
  "i",
);
// Case-sensitive: a case-insensitive `us`, `IN` or `OR` would turn prose
// ("join us") into U.S. evidence.
const US_ABBREVIATION = /\bUS\b|\bU\.S\.(?=\s|$|[,)\]-])/;
const US_STATE_CODE = new RegExp(
  String.raw`(?:,\s*|\b)(?:${[...STATE_CODES].join("|")})\b`,
);
const FOREIGN = new RegExp(
  String.raw`\b(?:Canada|Canadian|Toronto|Vancouver|Montreal|Calgary|Ottawa|Edmonton|Kitchener|` +
    String.raw`United Kingdom|UK|London|India|Germany|France|Ireland|Poland|Singapore|Australia|` +
    String.raw`Netherlands|Spain|Sweden|(?<!New\s)Mexico|Brazil|China|Japan|Taiwan|Israel|Italy|` +
    String.raw`Vietnam|Philippines|Pakistan|Bangladesh|Indonesia|Malaysia|Thailand|South Korea|` +
    String.raw`New Zealand|Portugal|Romania|Ukraine|Russia|Austria|Belgium|Denmark|Finland|Norway|` +
    String.raw`Switzerland|Czechia|Czech Republic|Hungary|Greece|Turkey|United Arab Emirates|UAE|` +
    String.raw`South Africa|Argentina|Chile|Colombia|Peru)\b`,
  "i",
);
// Only after a comma: a bare `ON` is usually "ON-SITE", not Ontario.
const CANADIAN_PROVINCE = /,\s*(?:AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT)\b/;
const COUNTRY_SUFFIX = /,?\s*\b(?:united states(?: of america)?|usa|us)\.?$/i;
const COUNTRY_PREFIX = /^(?:united states|usa|us)\s*[,-]\s*/i;

export interface ParsedLocation {
  sourceText: string;
  kind: JOB_BOARD.JobLocationKind;
  cityKey: string | null;
  state: string | null;
}

function stateCode(value: string) {
  const trimmed = value.trim().replace(/\.$/, "");
  if (STATE_CODES.has(trimmed.toUpperCase()) && trimmed.length === 2) {
    return trimmed.toUpperCase();
  }
  return (
    STATE_CODES_BY_NAME[trimmed.toLowerCase().replace(/\s+state$/, "")] ?? null
  );
}

/** "City, ST", "City, State", "ST", "State", or a city alias; null when none fits. */
function parseCityState(text: string) {
  const alias = CITY_ALIASES[text.toLowerCase()];
  if (alias) return alias;

  const value = text
    .replace(COUNTRY_SUFFIX, "")
    .replace(COUNTRY_PREFIX, "")
    .trim();
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  // Country-first "United States, Washington, Redmond" arrives as "Washington, Redmond".
  if (parts.length >= 2 && COUNTRY_PREFIX.test(text)) {
    const state = stateCode(parts[0] ?? "");
    if (state) return { city: parts.slice(1).join(" "), state };
  }
  if (parts.length >= 2) {
    const state = stateCode(parts.at(-1) ?? "");
    if (state) return { city: parts.slice(0, -1).join(" "), state };
  }
  if (parts.length === 1 && parts[0]) {
    const state = stateCode(parts[0]);
    if (state) return { city: null, state };
    const spaced = /^(.+?)\s+([A-Z]{2})$/.exec(parts[0]);
    if (spaced?.[1] && spaced[2] && STATE_CODES.has(spaced[2])) {
      return { city: spaced[1], state: spaced[2] };
    }
  }
  return null;
}

function hasUsEvidence(text: string) {
  return (
    EXPLICIT_US.test(text) ||
    US_ABBREVIATION.test(text) ||
    US_STATE_CODE.test(text) ||
    // "City, st" in any case: a state in the city/state slot, not prose.
    parseCityState(text) !== null
  );
}

/**
 * Whether a location's text is explicitly outside the U.S. Any U.S. evidence
 * wins, so "London, KY" and "Austin, TX or Toronto, ON" stay in scope.
 */
export function isForeignLocation(text: string) {
  return (
    (FOREIGN.test(text) || CANADIAN_PROVINCE.test(text)) && !hasUsEvidence(text)
  );
}

/**
 * One location text as a `JobLocation`. Remote alone isn't U.S. evidence, and
 * anything unresolved stays `unknown` with its original text.
 */
export function parseLocation(sourceText: string): ParsedLocation {
  const text = sourceText.replace(/\s+/g, " ").trim();
  const unknown: ParsedLocation = {
    sourceText: text,
    kind: "unknown",
    cityKey: null,
    state: null,
  };

  if (/\bremote\b/i.test(text)) {
    return hasUsEvidence(text) ? { ...unknown, kind: "remote_us" } : unknown;
  }

  const stripped = text
    .replace(/^(?:hybrid|on-?site|in office)\s*[-:(]\s*/i, "")
    .replace(/\)$/, "");
  const parsed = parseCityState(stripped);
  if (!parsed) return unknown;

  const city = parsed.city ? findUsCity(parsed.city, parsed.state) : null;
  if (city) {
    return {
      sourceText: text,
      kind: "city",
      cityKey: city.key,
      state: city.state,
    };
  }
  return {
    sourceText: text,
    kind: "state",
    cityKey: null,
    state: parsed.state,
  };
}

/** Splits one text that lists several places ("Austin, TX / Remote - US"). */
export function splitLocationTexts(texts: string[]) {
  return texts
    .flatMap((text) => text.split(/\s*(?:;|\||\s\/\s|<br\s*\/?>)\s*/i))
    .map((text) => text.trim())
    .filter(Boolean);
}

/** Work arrangement implied by the location texts, when they say. */
export function workArrangement(
  texts: string[],
): JOB_BOARD.JobWorkArrangement | null {
  const joined = texts.join(" ");
  if (/\bremote\b/i.test(joined)) return "remote";
  if (/\bhybrid\b/i.test(joined)) return "hybrid";
  return null;
}
