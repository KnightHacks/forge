/**
 * Shared identity-search ranking for admin screens.
 *
 * Three domains (`member/admin`, `roles/management`, `events/discovery`) each
 * grew their own copy of this ladder and the copies disagreed, so the same
 * query ordered results differently depending on which admin screen you were
 * on. This module is the single implementation.
 *
 * The ladder, highest first:
 *
 * | Score      | Rung                                                       |
 * | ---------- | ---------------------------------------------------------- |
 * | 1000       | the whole searchable text equals the token                 |
 * | 950        | some word equals the token                                 |
 * | 900        | the searchable text starts with the token                  |
 * | 850        | some word starts with the token                            |
 * | 800        | the searchable text contains the token                     |
 * | 600 - 50d  | some word is within edit distance `d` of the token         |
 * | `null`     | no match — the candidate is dropped                        |
 *
 * The pattern is anchoring: for each of equality, prefix, and containment, a
 * match anchored to the start of the whole text outranks the same match
 * anchored to the start of a word, which outranks an unanchored one.
 *
 * Because tokens never contain a space, the 900 rung fires exactly when the
 * token is a prefix of the *first* field a caller passes to
 * `scoreSearchCandidate`. That makes field order load-bearing: every caller
 * puts the candidate's primary human name first, so 900 means "prefix of the
 * primary name". Keep it that way when adding a field.
 */

const EXACT_TEXT_SCORE = 1_000;
const EXACT_WORD_SCORE = 950;
const TEXT_PREFIX_SCORE = 900;
const WORD_PREFIX_SCORE = 850;
const SUBSTRING_SCORE = 800;
const FUZZY_BASE_SCORE = 600;
const FUZZY_DISTANCE_PENALTY = 50;
const SHORT_TOKEN_LENGTH = 4;

/**
 * Folds a value into the comparable form the ladder operates on: diacritics
 * stripped, lower-cased, every run of non-alphanumeric characters replaced by a
 * single space, trimmed.
 */
export function normalizeSearchValue(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function editDistance(left: string, right: string) {
  const prior = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const next = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      next[rightIndex] = Math.min(
        (prior[rightIndex] ?? 0) + 1,
        (next[rightIndex - 1] ?? 0) + 1,
        (prior[rightIndex - 1] ?? 0) + cost,
      );
    }
    prior.splice(0, prior.length, ...next);
  }
  return prior[right.length] ?? Number.POSITIVE_INFINITY;
}

function scoreSearchToken(
  token: string,
  searchable: string,
  words: readonly string[],
) {
  if (searchable === token) return EXACT_TEXT_SCORE;
  if (words.includes(token)) return EXACT_WORD_SCORE;
  if (searchable.startsWith(token)) return TEXT_PREFIX_SCORE;
  if (words.some((word) => word.startsWith(token))) return WORD_PREFIX_SCORE;
  if (searchable.includes(token)) return SUBSTRING_SCORE;

  const allowedDistance = token.length <= SHORT_TOKEN_LENGTH ? 1 : 2;
  const closestDistance = Math.min(
    ...words.map((word) => editDistance(token, word)),
  );
  if (closestDistance <= allowedDistance) {
    return FUZZY_BASE_SCORE - closestDistance * FUZZY_DISTANCE_PENALTY;
  }

  return null;
}

/**
 * Scores one candidate's searchable text against a query.
 *
 * The query is split into tokens and every token must match something, so a
 * two-word query narrows rather than widens. Token scores are summed, which
 * means order within the query does not matter.
 *
 * Returns `0` for an empty query (every candidate ties) and `null` when a token
 * matched nothing, meaning the candidate should be dropped from results.
 */
export function scoreSearchCandidate(searchableText: string, query: string) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return 0;

  const searchable = normalizeSearchValue(searchableText);
  const words = searchable.split(" ");

  let total = 0;
  for (const token of normalizedQuery.split(" ")) {
    const score = scoreSearchToken(token, searchable, words);
    if (score === null) return null;
    total += score;
  }
  return total;
}
