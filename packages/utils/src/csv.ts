/**
 * The one CSV encoder. Five exports each grew their own, with four different
 * formula-injection guards and two line terminators, so a bypass fixed in one
 * export stayed open in the other four. Escaping is security-shaped, so it is
 * promoted here rather than copied — see the placement rule on divergence.
 *
 * Three separable decisions, settled once:
 *
 * 1. **Formula neutralization.** Excel, Sheets, and LibreOffice all treat a
 *    cell opening with `=`, `+`, `-`, or `@` as a formula, so those four get a
 *    leading apostrophe, which every spreadsheet reads as "this cell is text"
 *    and strips on import. Quoting is *not* a guard: Excel evaluates a quoted
 *    `"=1+1"` exactly like a bare one.
 *
 * 2. **Leading noise is transparent, not a trigger.** Spreadsheets skip
 *    whitespace, control characters, and zero-width characters before deciding
 *    a cell is a formula, so the guard skips them too. The four old guards each
 *    stopped at a different point in that set and each left a live bypass: VT,
 *    FF, NBSP, and BOM before `=` sailed past two of them, a plain space past a
 *    third, and NUL and ZWSP past all four. Testing the *stripped* text closes
 *    the class instead of one member of it. The apostrophe still goes in front
 *    of the original text — the noise is data and is preserved.
 *
 * 3. **Quoting** is RFC 4180 correctness, not part of the guard, so the
 *    narrowest sufficient rule wins: quote when the field carries a delimiter,
 *    a quote, a control character (TAB is outside RFC 4180 TEXTDATA), or edge
 *    whitespace that parsers disagree about trimming.
 */

/**
 * Characters a spreadsheet skips before it decides whether a cell is a formula:
 * all whitespace, all C0/C1 control characters, and all zero-width/format
 * characters. Anchored and greedy, so `.replace` strips the whole run.
 */
const LEADING_NOISE = /^[\s\p{Cc}\p{Cf}]*/u;

/** Cell openers that Excel, Sheets, or LibreOffice will evaluate. */
const FORMULA_OPENER = /^[=+\-@]/;

/**
 * Fields that cannot be written bare: RFC 4180 delimiters, any control
 * character, or leading/trailing whitespace a parser might trim.
 */
const MUST_QUOTE = /^\s|\s$|[",\p{Cc}]/u;

function renderCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  // Only objects survive to here besides functions and symbols, which
  // `JSON.stringify` renders as `undefined` rather than as a string.
  return typeof value === "object" ? JSON.stringify(value) : "";
}

/**
 * Renders one value as a CSV field: formula-neutralized, then quoted only when
 * it has to be.
 */
export function escapeCsvCell(value: unknown): string {
  const rendered = renderCell(value);
  const guarded = FORMULA_OPENER.test(rendered.replace(LEADING_NOISE, ""))
    ? `'${rendered}`
    : rendered;
  return MUST_QUOTE.test(guarded)
    ? `"${guarded.replaceAll('"', '""')}"`
    : guarded;
}

/**
 * Joins rows into a CSV document. CRLF, including a trailing one, because that
 * is what RFC 4180 specifies and what Excel on Windows expects; the exports
 * that used bare LF were the outliers.
 */
export function serializeCsvRows(
  rows: readonly (readonly unknown[])[],
): string {
  return rows.map((row) => `${row.map(escapeCsvCell).join(",")}\r\n`).join("");
}
