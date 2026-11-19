import type { JOB_BOARD } from "@forge/consts";

// Category rules ported from CS Job Poster `outsource/categories.py`; track
// signals from `job_bot/filters.py` (#633). Categories never exclude a job.

const ROLE_PATTERNS = {
  pm: String.raw`(?:product|program|project) (?:\w+ ){0,2}(?:manager|management)|\b[at]?pm\b`,
  quant: String.raw`quant(?:itative)?(?: |$)|algorithmic trad(?:er|ing)`,
  design: String.raw`\b(?:ux|ui)\b|user (?:experience|interface)|product design|interaction design`,
  data_ai:
    String.raw`data (?:engineer|scien)|machine learning|\b(?:ml|ai|nlp)\b|` +
    String.raw`artificial intelligence|deep learning|computer vision|applied (?:scientist|research)`,
  it_security:
    String.raw`cyber ?security|information security|security (?:analyst|operations)|` +
    String.raw`soc analyst|penetration test|\b(?:it|help ?desk|sysadmin)\b|` +
    String.raw`(?:systems?|network|cloud|database) administrat|technical support|` +
    String.raw`desktop support|network engineer`,
  hardware:
    String.raw`hardware|electrical|electronics|\b(?:fpga|asic|rtl|vlsi)\b|` +
    String.raw`chip design|semiconductor|silicon|robotics|mechatronics|physical systems`,
  swe:
    String.raw`software|\bswe\b|front ?end|back ?end|full ?stack|developer|programmer|` +
    String.raw`mobile|embedded|firmware|platform engineer|site reliability|\bsre\b|` +
    String.raw`dev ?ops|devsecops|test automation|automation (?:test |qa )?engineer|` +
    String.raw`\bsdet\b|quality assurance engineer|cloud engineer|gameplay`,
  analyst: String.raw`analyst|analytics|business intelligence|\bbi\b`,
} satisfies Record<Exclude<JOB_BOARD.JobCategory, "other">, string>;

type PatternKey = keyof typeof ROLE_PATTERNS;

const ROLE_REGEXES = Object.fromEntries(
  Object.entries(ROLE_PATTERNS).map(([key, pattern]) => [
    key,
    new RegExp(String.raw`\b(?:${pattern})`),
  ]),
) as Record<PatternKey, RegExp>;

function normalizeText(text: string) {
  return text
    .replace(/<[^>]+>/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const matches = (text: string, key: PatternKey) => ROLE_REGEXES[key].test(text);

export function classifyCategory(
  title: string,
  description = "",
): JOB_BOARD.JobCategory {
  const titleText = normalizeText(title);
  // The pronoun "it" is not evidence of an IT role in a description.
  const summaryText = normalizeText(description.replace(/\b[Ii]t\b/g, ""));

  // Specific families precede the broad software bucket.
  for (const key of ["pm", "quant", "design", "data_ai"] as const) {
    if (matches(titleText, key)) return key;
  }
  if (matches(titleText, "analyst")) {
    return matches(titleText, "it_security") ? "it_security" : "analyst";
  }
  if (/\b(?:software|firmware|embedded software)\b/.test(titleText)) {
    return "swe";
  }
  for (const key of ["it_security", "analyst", "hardware", "swe"] as const) {
    if (matches(titleText, key)) return key;
  }
  if (titleText.includes("security engineer")) return "it_security";
  if (/\bsystems? engineer/.test(titleText)) {
    for (const key of ["it_security", "hardware"] as const) {
      if (matches(summaryText, key)) return key;
    }
    return "swe";
  }
  // Only trust a description that points to exactly one family.
  const summaryMatches = (Object.keys(ROLE_PATTERNS) as PatternKey[]).filter(
    (key) => matches(summaryText, key),
  );
  return summaryMatches.length === 1 && summaryMatches[0]
    ? summaryMatches[0]
    : "other";
}

const INTERNSHIP_SIGNAL = /\b(?:intern|internship|co ?op)\b/;
const NEW_GRAD_SIGNAL =
  /\b(?:new grad|new graduate|entry level|early career|graduate|(?:software (?:engineer|developer)) (?:i|1))\b/;
// "manager" and "lead" are left out: "Product Manager Intern" is a student role.
const SENIORITY_SIGNAL =
  /\b(?:senior|sr|staff|principal|director|vp|architect)\b/;

/**
 * The track for a listing, or null when it isn't a student role. A source
 * scoped to one track (curated GitHub lists) is trusted as-is.
 */
export function classifyTrack(
  title: string,
  hint?: JOB_BOARD.JobTrack,
): JOB_BOARD.JobTrack | null {
  if (hint) return hint;
  const text = normalizeText(title);
  if (INTERNSHIP_SIGNAL.test(text)) return "internship";
  if (SENIORITY_SIGNAL.test(text)) return null;
  if (NEW_GRAD_SIGNAL.test(text)) return "new_grad";
  return null;
}
