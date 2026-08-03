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
  return status in HACKER_STATUS_LABELS
    ? HACKER_STATUS_LABELS[status as SendingStatus]
    : "Checked in";
}

export function HackerTable({
  hackers,
  onOpen,
  onSelectAllShown,
  onToggle,
  onToggleRange,
  selected,
}: {
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
              className="cursor-pointer"
              data-selected={isSelected ? "true" : undefined}
              key={hacker.attendeeId}
              // Click opens the applicant; shift-click extends the selection
              // from the last row clicked. Selection also lives on the checkbox
              // column, so both gestures are available — requiring a 20px
              // checkbox for every pick is what made multi-select feel broken.
              onClick={(event) => {
                if (event.shiftKey) {
                  // Stops the browser painting a text selection across the rows
                  // being swept.
                  event.preventDefault();
                  onToggleRange(hacker.attendeeId);
                  return;
                }
                onOpen(hacker);
              }}
            >
              <TableCell className="pl-4">
                <Checkbox
                  aria-label={`Select ${hacker.name}`}
                  checked={isSelected}
                  // The row handler owns selection; this is a visual affordance
                  // and a keyboard target, so it must not toggle twice.
                  onCheckedChange={() => onToggle(hacker.attendeeId)}
                  onClick={(event) => event.stopPropagation()}
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
