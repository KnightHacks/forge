/** Maximum persisted SQL preview length, after removing values and comments. */
const MAX_SQL_PREVIEW_LENGTH = 4096;

/**
 * This is a privacy lexer, not a SQL validator. Quoted identifiers are hidden
 * too: a failed query can put a credential inside double quotes. Ambiguous or
 * unfinished quoted input is omitted entirely, including truncated input.
 */
export function sqlPreview(query: string): string | null {
  // Bound work on an untrusted SQL string without exposing an unfinished value.
  if (query.length > 65_536) return null;

  let preview = "";
  let position = 0;
  while (position < query.length) {
    const rest = query.slice(position);
    if (rest.startsWith("--")) {
      const end = rest.search(/[\r\n]/);
      position = end === -1 ? query.length : position + end;
      preview += " ";
      continue;
    }
    if (rest.startsWith("/*")) {
      let depth = 1;
      position += 2;
      while (position < query.length && depth > 0) {
        if (query.startsWith("/*", position)) {
          depth++;
          position += 2;
        } else if (query.startsWith("*/", position)) {
          depth--;
          position += 2;
        } else {
          position++;
        }
      }
      if (depth > 0) return null;
      preview += " ";
      continue;
    }

    const dollarQuote = /^(\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$)/.exec(rest)?.[1];
    if (dollarQuote) {
      const end = query.indexOf(dollarQuote, position + dollarQuote.length);
      if (end === -1) return null;
      position = end + dollarQuote.length;
      preview += "?";
      continue;
    }

    const quoted = /^(?:[eEbBxX]|[uU]&)?(['"])/.exec(rest);
    if (quoted) {
      const quote = quoted[1];
      if (!quote) return null;
      position += quoted[0].length;
      let closed = false;
      while (position < query.length) {
        if (query[position] === "\\") {
          // Ordinary strings depend on standard_conforming_strings. Choosing
          // either interpretation can expose the next literal as an identifier.
          if (!/^[eE]'/.test(quoted[0])) return null;
          position += 2;
        } else if (query[position] === quote) {
          position++;
          if (query[position] === quote) position++;
          else {
            closed = true;
            break;
          }
        } else {
          position++;
        }
      }
      if (!closed) return null;
      preview += "?";
      continue;
    }

    const number = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(rest)?.[0];
    if (number) {
      preview += "?";
      position += number.length;
      continue;
    }
    const token =
      /^(?:[A-Za-z_][A-Za-z0-9_$]*|\$\d+|\s+|[(),.;*+\-/<>!=:%[\]|&^~?])/.exec(
        rest,
      )?.[0];
    if (!token) return null;
    preview += token;
    position += token.length;
  }

  return preview.replace(/\s+/g, " ").trim().slice(0, MAX_SQL_PREVIEW_LENGTH);
}
