"use client";

import { Ban, MailWarning } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
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

/** The two an officer reaches for constantly; the rest live in bulk. */
const QUICK_ACTIONS: SendingStatus[] = ["accepted", "denied"];

export function HackerTable({
  blocked,
  busy,
  hackers,
  loading,
  onBlacklist,
  onSelectAllShown,
  onSetStatus,
  onToggle,
  onToggleRange,
  selected,
}: {
  blocked: boolean;
  busy: boolean;
  hackers: Roster;
  loading: boolean;
  onBlacklist: (hacker: Hacker) => void;
  onSelectAllShown: (next: boolean) => void;
  onSetStatus: (attendeeId: string, status: SendingStatus) => void;
  onToggle: (attendeeId: string) => void;
  onToggleRange: (attendeeId: string) => void;
  selected: ReadonlySet<string>;
}) {
  const allShownSelected =
    hackers.length > 0 &&
    hackers.every((hacker) => selected.has(hacker.attendeeId));

  if (hackers.length === 0 && !loading) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        No applicants match these filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                aria-label="Select every applicant shown"
                checked={allShownSelected}
                onCheckedChange={(next) => onSelectAllShown(next === true)}
              />
            </TableHead>
            <TableHead>Applicant</TableHead>
            <TableHead>School</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Points</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hackers.map((hacker) => {
            const isSelected = selected.has(hacker.attendeeId);
            return (
              <TableRow
                data-selected={isSelected ? "true" : undefined}
                key={hacker.attendeeId}
              >
                <TableCell>
                  <Checkbox
                    aria-label={`Select ${hacker.name}`}
                    checked={isSelected}
                    // Shift extends from the last row clicked. Reading the
                    // modifier here rather than from a keydown listener keeps
                    // the range tied to the click that requested it.
                    onClick={(event) => {
                      if (event.shiftKey) {
                        event.preventDefault();
                        onToggleRange(hacker.attendeeId);
                      }
                    }}
                    onCheckedChange={() => onToggle(hacker.attendeeId)}
                  />
                </TableCell>
                <TableCell className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 font-medium">
                    <span className="break-words">{hacker.name}</span>
                    {hacker.blacklisted ? (
                      <Badge className="gap-1" variant="destructive">
                        <Ban className="size-3" aria-hidden="true" />
                        Blacklisted
                      </Badge>
                    ) : null}
                    {hacker.deliveryFailed ? (
                      <Badge className="gap-1" variant="destructive">
                        <MailWarning className="size-3" aria-hidden="true" />
                        Email failed
                      </Badge>
                    ) : null}
                  </div>
                  <p className="break-all text-sm text-muted-foreground">
                    {hacker.email}
                  </p>
                  {/*
                    Contact details surface only on a failed row, because that
                    is the only time an officer needs to reach someone another
                    way. Showing everyone's phone number by default would be
                    exposing applicant data with no reason to.
                  */}
                  {hacker.deliveryFailed ? (
                    <p className="mt-1 text-sm text-destructive">
                      {hacker.sendError ?? "Delivery failed."} Reach them at{" "}
                      {hacker.phoneNumber}
                      {hacker.discordUser ? ` or @${hacker.discordUser}` : ""}.
                    </p>
                  ) : null}
                  {hacker.blacklisted && hacker.blacklistReason ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Blacklisted: {hacker.blacklistReason}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell className="text-sm">{hacker.school}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {HACKER_STATUS_LABELS[hacker.status as SendingStatus]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-sm">
                  {hacker.points}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap justify-end gap-2">
                    {QUICK_ACTIONS.map((status) => (
                      <Button
                        className="min-h-11"
                        // A blacklisted applicant can be capacity-rejected and
                        // nothing else — that is how they leave the funnel.
                        disabled={
                          busy ||
                          blocked ||
                          (hacker.blacklisted && status !== "denied")
                        }
                        key={status}
                        onClick={() => onSetStatus(hacker.attendeeId, status)}
                        size="sm"
                        variant={
                          status === "accepted" ? "primary" : "secondary"
                        }
                      >
                        {HACKER_STATUS_LABELS[status]}
                      </Button>
                    ))}
                    <Button
                      className="min-h-11"
                      disabled={busy}
                      onClick={() => onBlacklist(hacker)}
                      size="sm"
                      variant="ghost"
                    >
                      {hacker.blacklisted ? "Un-blacklist" : "Blacklist"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
