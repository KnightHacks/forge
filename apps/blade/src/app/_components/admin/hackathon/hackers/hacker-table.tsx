"use client";

import { Ban, MailWarning } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Badge } from "@forge/ui/badge";
import { Checkbox } from "@forge/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@forge/ui/table";
import { HACKER_STATUS_LABELS } from "@forge/validators";

type Roster = RouterOutputs["hacker"]["listForHackathon"]["hackers"];
type Hacker = Roster[number];
type SendingStatus = keyof typeof HACKER_STATUS_LABELS;

/**
 * `checkedin` is a real stored status the roster can filter to but an officer
 * cannot set, so it has no entry in the label map — casting the lookup hid that
 * and rendered a blank badge for every checked-in applicant.
 */
function statusLabel(status: string) {
  // `hasOwn`, not `in`, which walks the prototype and would return a function
  // for `"toString"`.
  return Object.hasOwn(HACKER_STATUS_LABELS, status)
    ? HACKER_STATUS_LABELS[status as SendingStatus]
    : "Checked in";
}

export function HackerTable({
  busy,
  hackers,
  onOpen,
  onSelectAllShown,
  onToggle,
  onToggleRange,
  selected,
}: {
  /**
   * True while a filter change is being checked against the selection, and
   * while the officer is answering the prompt that check produced.
   *
   * Selecting during either window changes the set the answer was computed
   * over, so a check that reported "nobody is dropped" could commit while rows
   * added afterwards sat selected and off-screen under the new filter — and the
   * next bulk action mailed them.
   */
  busy: boolean;
  hackers: Roster;
  onOpen: (hacker: Hacker) => void;
  onSelectAllShown: (next: boolean) => void;
  onToggle: (attendeeId: string) => void;
  onToggleRange: (attendeeId: string) => void;
  selected: ReadonlySet<string>;
}) {
  const selectedShown = hackers.filter((hacker) =>
    selected.has(hacker.attendeeId),
  ).length;
  // Three states, not two: a binary box renders empty when thirty of fifty rows
  // are ticked, which reads as "nothing selected" while a large selection is
  // live.
  const headerChecked =
    selectedShown === 0
      ? false
      : selectedShown === hackers.length
        ? true
        : "indeterminate";

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-12 pl-4">
            <Checkbox
              aria-label="Select every applicant shown"
              checked={headerChecked}
              disabled={busy}
              onCheckedChange={(next) => onSelectAllShown(next === true)}
            />
          </TableHead>
          <TableHead>Applicant</TableHead>
          <TableHead className="hidden md:table-cell">School</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden text-right sm:table-cell">
            Points
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {hackers.map((hacker) => {
          const isSelected = selected.has(hacker.attendeeId);
          return (
            <TableRow
              aria-selected={isSelected}
              className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              data-selected={isSelected ? "true" : undefined}
              key={hacker.attendeeId}
              /*
                Operable from a keyboard, with a gesture for each thing the
                mouse can do: Enter opens the record, Space toggles this row,
                Shift+Enter extends from the last one. Space matters most —
                `selectRange` only ever adds, so without a plain toggle a
                keyboard officer who selected one person too many could only
                clear the entire selection and start over.
              */
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (event.shiftKey) {
                    if (!busy) onToggleRange(hacker.attendeeId);
                  } else onOpen(hacker);
                  return;
                }
                if (event.key === " ") {
                  event.preventDefault();
                  if (!busy) onToggle(hacker.attendeeId);
                }
              }}
              tabIndex={0}
              // Click opens the applicant; shift-click extends the selection
              // from the last row clicked. Selection also lives on the checkbox
              // column, so both gestures are available — requiring a 20px
              // checkbox for every pick is what made multi-select feel broken.
              onClick={(event) => {
                if (event.shiftKey) {
                  if (!busy) onToggleRange(hacker.attendeeId);
                  return;
                }
                onOpen(hacker);
              }}
              // `preventDefault` on click is too late to stop the browser
              // painting a text selection across a shift-sweep — that is
              // decided on mousedown.
              onMouseDown={(event) => {
                if (event.shiftKey) event.preventDefault();
              }}
            >
              {/*
                The whole cell is the hit area, not the 20px box — this is the
                densest part of the screen and a mis-tap would open the detail
                dialog instead of selecting.
              */}
              <TableCell
                className="pl-4"
                onClick={(event) => {
                  event.stopPropagation();
                  if (busy) return;
                  // Shift on the checkbox means the same thing it means on the
                  // row. Previously it silently degraded to a single toggle,
                  // with no signal that the gesture had done something else.
                  if (event.shiftKey) onToggleRange(hacker.attendeeId);
                  else onToggle(hacker.attendeeId);
                }}
              >
                <Checkbox
                  aria-label={`Select ${hacker.name}`}
                  checked={isSelected}
                  disabled={busy}
                  // The cell owns the click; this is the visual affordance, so
                  // it must not toggle a second time.
                  onClick={(event) => event.preventDefault()}
                  // Radix keeps focus on this button after a mouse click, and
                  // the row's handler would then read Space as "open". Handling
                  // it here keeps Space meaning "toggle" wherever focus landed.
                  onKeyDown={(event) => {
                    if (event.key !== " " && event.key !== "Enter") return;
                    event.preventDefault();
                    event.stopPropagation();
                    if (!busy) onToggle(hacker.attendeeId);
                  }}
                  tabIndex={-1}
                />
              </TableCell>
              <TableCell className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="break-words font-medium">{hacker.name}</span>
                  {hacker.blacklisted ? (
                    <Badge className="gap-1 text-sm" variant="destructive">
                      <Ban className="size-3" aria-hidden="true" />
                      Blacklisted
                    </Badge>
                  ) : null}
                  {hacker.deliveryFailed ? (
                    <Badge className="gap-1 text-sm" variant="destructive">
                      <MailWarning className="size-3" aria-hidden="true" />
                      Email failed
                    </Badge>
                  ) : null}
                </div>
                <p className="break-all text-sm text-muted-foreground">
                  {hacker.email}
                </p>
              </TableCell>
              <TableCell className="hidden text-sm md:table-cell">
                {hacker.school}
              </TableCell>
              <TableCell>
                <Badge className="text-sm" variant="secondary">
                  {statusLabel(hacker.status)}
                </Badge>
              </TableCell>
              <TableCell className="hidden text-right text-sm sm:table-cell">
                {hacker.points}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
