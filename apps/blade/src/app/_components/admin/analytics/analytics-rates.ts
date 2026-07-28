/**
 * A share of a population that may be empty. An empty denominator has no rate,
 * so it returns `null` and the formatters render it as an em dash instead of
 * showing 0% for "nobody was measured".
 */
export function ratio(numerator: number, denominator: number) {
  return denominator === 0 ? null : numerator / denominator;
}
