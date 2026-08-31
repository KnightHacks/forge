"use client";

import { ArrowRight, Clock3, MapPin } from "lucide-react";

import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";
import { MarkdownContent } from "@forge/ui/markdown-content";

import type { PublicClubEvent } from "../_lib/club-events";
import { formatEventTime } from "../_lib/club-events";
import { ClubEventAccessBadge } from "./club-event-access-badge";
import { ClubEventDate } from "./club-event-date";

export function ClubEventDetailsDialog({ event }: { event: PublicClubEvent }) {
  const eventTime = formatEventTime(event.startDateTime);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 min-h-11 rounded-none px-0 py-2 text-[11px] font-black uppercase tracking-wide text-[var(--club-gold)] hover:bg-transparent hover:text-white focus-visible:ring-[var(--club-gold)]"
        >
          View details
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100svh-2rem)] w-[calc(100%_-_2rem)] gap-0 overflow-y-auto rounded-none border-[3px] border-black bg-[#210728] p-0 text-white shadow-[8px_8px_0_rgba(255,182,43,0.85)] sm:max-w-xl [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center">
        <DialogHeader className="border-b border-white/10 bg-[#59168b]/35 px-6 py-5 pr-12 text-left">
          <p className="text-xs font-black uppercase tracking-wide text-[var(--club-gold)]">
            {event.tag}
          </p>
          <DialogTitle className="text-2xl font-black leading-tight text-white sm:text-3xl">
            {event.name}
          </DialogTitle>
          <DialogDescription className="text-sm text-white/65">
            Complete event information
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-6">
          <div className="grid gap-5 sm:grid-cols-[5rem_1fr] sm:items-center">
            <ClubEventDate startDateTime={event.startDateTime} />

            <div className="flex flex-col items-start gap-3 text-xs font-black uppercase text-[var(--club-gold)]">
              {eventTime ? (
                <span className="inline-flex items-center gap-2">
                  <Clock3 aria-hidden="true" className="size-4" />
                  {eventTime}
                </span>
              ) : null}
              {event.location ? (
                <span className="inline-flex items-start gap-2">
                  <MapPin
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0"
                  />
                  {event.location}
                </span>
              ) : null}
              <ClubEventAccessBadge requiresDues={event.requiresDues} />
            </div>
          </div>

          <MarkdownContent className="mt-6 border-t border-white/10 pt-6 text-sm leading-6 text-[var(--club-muted)] [&_a]:text-[var(--club-gold)]">
            {event.description}
          </MarkdownContent>
        </div>

        <DialogFooter className="border-t border-white/10 px-6 py-4">
          <DialogClose asChild>
            <Button
              type="button"
              className="club-button min-h-11 bg-[var(--club-gold)] px-6 py-2.5 text-black shadow-[3px_3px_0_rgba(255,255,255,0.85)]"
            >
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
