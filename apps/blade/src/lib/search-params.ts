/**
 * Shared shape and readers for Next.js `searchParams`.
 *
 * Next gives every query value as `string | string[] | undefined`, because a
 * key can appear zero, one, or many times in the URL. These helpers narrow that
 * down before feature code parses it.
 */
export type SearchParams = Record<string, string | string[] | undefined>;

/** First value for a key, or `undefined` when the key is absent. */
export function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
