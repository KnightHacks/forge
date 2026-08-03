/** @vitest-environment jsdom */
import { act } from "react";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useHackerSelection } from "~/app/_components/admin/hackathon/hackers/use-hacker-selection";

/** Rows as displayed. Ranges follow this, not any underlying order. */
const PAGE_ONE = ["a", "b", "c", "d", "e"];
const PAGE_TWO = ["f", "g", "h"];

describe("TC-015: the selection is amendable", () => {
  it("a range adds to the selection rather than replacing it", () => {
    const { result } = renderHook(() => useHackerSelection());

    act(() => result.current.toggle("a"));
    act(() => result.current.toggle("e"));
    // Anchor is now "e"; extend back to "b".
    act(() => result.current.selectRange("b", PAGE_ONE));

    // "a" was selected before the range and must survive it. A range that
    // replaced the selection would drop it, which is the behaviour that makes
    // a multi-select feel like it is fighting you.
    expect([...result.current.selected].sort()).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
    ]);
  });

  it("deselecting one row leaves the others", () => {
    const { result } = renderHook(() => useHackerSelection());

    act(() => result.current.toggle("a"));
    act(() => result.current.selectRange("d", PAGE_ONE));
    act(() => result.current.toggle("c"));

    expect([...result.current.selected].sort()).toEqual(["a", "b", "d"]);
  });

  it("survives paging away and back", () => {
    const { result } = renderHook(() => useHackerSelection());

    act(() => result.current.toggle("a"));
    act(() => result.current.toggle("b"));
    // Page two: select there too, then "return" to page one.
    act(() => result.current.setAllShown(PAGE_TWO, true));

    // The case that rules out deriving the selection from rendered rows — the
    // implementation that looks correct until someone pages.
    expect([...result.current.selected].sort()).toEqual([
      "a",
      "b",
      "f",
      "g",
      "h",
    ]);
  });

  it("selects a range in either direction", () => {
    const { result } = renderHook(() => useHackerSelection());

    act(() => result.current.toggle("d"));
    act(() => result.current.selectRange("b", PAGE_ONE));

    expect([...result.current.selected].sort()).toEqual(["b", "c", "d"]);
  });

  it("treats a range with no anchor as a single selection", () => {
    const { result } = renderHook(() => useHackerSelection());

    act(() => result.current.selectRange("c", PAGE_ONE));

    expect([...result.current.selected]).toEqual(["c"]);
  });
});

describe("header select-all applies to what is shown", () => {
  it("adds every shown row without touching others", () => {
    const { result } = renderHook(() => useHackerSelection());

    act(() => result.current.setAllShown(PAGE_TWO, true));
    act(() => result.current.setAllShown(PAGE_ONE, true));
    act(() => result.current.setAllShown(PAGE_ONE, false));

    // Clearing page one must not clear page two.
    expect([...result.current.selected].sort()).toEqual(["f", "g", "h"]);
  });
});

describe("AC-031: dropping only what leaves the view", () => {
  it("deselects the named rows and keeps the rest", () => {
    const { result } = renderHook(() => useHackerSelection());

    act(() => result.current.setAllShown(PAGE_ONE, true));
    // What `selectionSurvival` reported as no longer matching.
    act(() => result.current.deselect(["b", "d"]));

    expect([...result.current.selected].sort()).toEqual(["a", "c", "e"]);
  });
});
