"use client";

import { useCallback, useRef, useState } from "react";

/**
 * An amendable multi-select over roster rows.
 *
 * The selection is a `Set` of attendee ids held here, **not** derived from the
 * rows currently rendered. That distinction is the whole point: a selection
 * derived from what is on screen looks correct until an officer pages, at which
 * point everything they picked silently disappears. Bulk is the primary flow on
 * this screen, so losing a selection to a scroll is losing real work.
 *
 * "Amendable" means a range *adds* to what is already selected, toggling one
 * row leaves the rest alone, and the count is always available — because the
 * count is the only confirmation an officer gets that their correction landed.
 */
export function useHackerSelection() {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  /** Anchor for shift-click. Held in a ref: it never affects rendering. */
  const anchorRef = useRef<string | null>(null);

  const toggle = useCallback((id: string) => {
    anchorRef.current = id;
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /**
   * Select everything between the last clicked row and this one.
   *
   * Adds rather than replaces, and works in either direction. `orderedIds` is
   * the rows as currently displayed, so a range follows what the officer sees
   * rather than any underlying order.
   */
  const selectRange = useCallback((id: string, orderedIds: string[]) => {
    const anchor = anchorRef.current;
    setSelected((current) => {
      const next = new Set(current);
      if (anchor === null) {
        next.add(id);
        return next;
      }
      const from = orderedIds.indexOf(anchor);
      const to = orderedIds.indexOf(id);
      if (from === -1 || to === -1) {
        next.add(id);
        return next;
      }
      const [start, end] = from <= to ? [from, to] : [to, from];
      for (let index = start; index <= end; index++) {
        const rowId = orderedIds[index];
        if (rowId) next.add(rowId);
      }
      return next;
    });
    anchorRef.current = id;
  }, []);

  /** Header control: select or clear everything currently shown. */
  const setAllShown = useCallback((orderedIds: string[], next: boolean) => {
    setSelected((current) => {
      const updated = new Set(current);
      for (const id of orderedIds) {
        if (next) updated.add(id);
        else updated.delete(id);
      }
      return updated;
    });
  }, []);

  /** Drops specific ids, keeping the rest — used when a filter hides rows. */
  const deselect = useCallback((ids: string[]) => {
    setSelected((current) => {
      const next = new Set(current);
      for (const id of ids) next.delete(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    anchorRef.current = null;
    setSelected(new Set());
  }, []);

  /**
   * Drops the shift-click anchor without touching the selection.
   *
   * Called when the displayed rows change. A stale anchor still present in the
   * new list makes the next shift-click span from a row the officer clicked
   * under a different filter — selecting an entire page they never meant to
   * touch, on the screen whose primary action mails people.
   */
  const resetAnchor = useCallback(() => {
    anchorRef.current = null;
  }, []);

  return {
    clear,
    deselect,
    resetAnchor,
    selectRange,
    selected,
    setAllShown,
    toggle,
  };
}
