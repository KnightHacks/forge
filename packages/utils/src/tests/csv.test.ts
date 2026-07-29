import { describe, expect, it } from "vitest";

import { escapeCsvCell, serializeCsvRows } from "../csv";

/**
 * These cases are the differences that used to distinguish the five encoders
 * under `packages/api/src/utils/**`, pinned so the family cannot re-diverge
 * silently.
 */

/** Reads a single encoded field back, so a guard assertion can be exact. */
function decodeField(field: string) {
  return field.startsWith('"') && field.endsWith('"')
    ? field.slice(1, -1).replaceAll('""', '"')
    : field;
}

describe("escapeCsvCell", () => {
  it("leaves ordinary text bare", () => {
    expect(escapeCsvCell("Alice Builder")).toBe("Alice Builder");
    expect(escapeCsvCell("")).toBe("");
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
  });

  it.each(["=HYPERLINK(x)", "+1-555-0100", "-3+cmd", "@SUM(A1)"])(
    "neutralizes the formula opener in %s",
    (value) => {
      expect(escapeCsvCell(value)).toBe(`'${value}`);
    },
  );

  it("does not neutralize an opener that is not first", () => {
    expect(escapeCsvCell("a=1")).toBe("a=1");
    expect(escapeCsvCell("Knight-Hacks")).toBe("Knight-Hacks");
    expect(escapeCsvCell("x@example.test")).toBe("x@example.test");
  });

  /**
   * The bypass named in the divergence report. `forms/export.ts` did in fact
   * catch this one, via `trimStart()`; the guard that would have missed it was
   * `events/feedback.ts`, whose class `/^[=+\-@\t\r]/` only matched because TAB
   * is a trigger character there in its own right, so ` =CMD` with a plain
   * leading space walked straight through. Both are pinned below.
   */
  it("neutralizes a formula hidden behind a leading tab", () => {
    expect(escapeCsvCell("\t=cmd|' /C calc'!A0")).toBe(
      "\"'\t=cmd|' /C calc'!A0\"",
    );
  });

  it.each([
    ["TAB", "\t"],
    ["LF", "\n"],
    ["VT", "\v"],
    ["FF", "\f"],
    ["CR", "\r"],
    ["SPACE", " "],
    ["NUL", "\u0000"],
    ["NBSP", "\u00a0"],
    ["BOM", "\ufeff"],
    ["ZWSP", "\u200b"],
    ["ZWNJ", "\u200c"],
    ["SPACE then TAB", " \t"],
    ["TAB then SPACE", "\t "],
    ["NBSP then NBSP", "\u00a0\u00a0"],
  ])("neutralizes a formula hidden behind %s", (_name, noise) => {
    const value = `${noise}=IMPORTXML("https://evil.test")`;

    expect(decodeField(escapeCsvCell(value))).toBe(`'${value}`);
  });

  it("preserves the leading noise rather than stripping it", () => {
    expect(escapeCsvCell("  \t =2+2")).toBe('"\'  \t =2+2"');
  });

  it("treats leading whitespace as transparent, not as a trigger", () => {
    expect(decodeField(escapeCsvCell("\tplain"))).toBe("\tplain");
    expect(decodeField(escapeCsvCell(" Alice "))).toBe(" Alice ");
  });

  it("quotes fields that cannot be written bare", () => {
    expect(escapeCsvCell('Builder, "speaker"')).toBe('"Builder, ""speaker"""');
    expect(escapeCsvCell("line one\nline two")).toBe('"line one\nline two"');
    expect(escapeCsvCell("line one\r\nline two")).toBe(
      '"line one\r\nline two"',
    );
    expect(escapeCsvCell("a\tb")).toBe('"a\tb"');
    expect(escapeCsvCell(" padded ")).toBe('" padded "');
  });

  it("renders dates, numbers, booleans, bigints, and objects", () => {
    expect(escapeCsvCell(new Date("2026-07-15T18:00:00.000Z"))).toBe(
      "2026-07-15T18:00:00.000Z",
    );
    expect(escapeCsvCell(0)).toBe("0");
    expect(escapeCsvCell(false)).toBe("false");
    expect(escapeCsvCell(10n)).toBe("10");
    expect(escapeCsvCell({ a: 1 })).toBe('"{""a"":1}"');
    expect(escapeCsvCell(() => null)).toBe("");
  });
});

describe("serializeCsvRows", () => {
  it("joins fields with commas and terminates every record with CRLF", () => {
    expect(
      serializeCsvRows([
        ["Name", "Points"],
        ["Alice", 3],
        ["=cmd", null],
      ]),
    ).toBe("Name,Points\r\nAlice,3\r\n'=cmd,\r\n");
  });

  it("never emits a bare LF as a record separator", () => {
    const csv = serializeCsvRows([["a"], ["b"]]);

    expect(csv).toBe("a\r\nb\r\n");
    expect(csv.replaceAll("\r\n", "")).not.toContain("\n");
  });

  it("keeps an embedded newline inside its quoted field", () => {
    expect(serializeCsvRows([["one\ntwo", "x"]])).toBe('"one\ntwo",x\r\n');
  });

  it("emits an empty document for no rows", () => {
    expect(serializeCsvRows([])).toBe("");
  });
});
