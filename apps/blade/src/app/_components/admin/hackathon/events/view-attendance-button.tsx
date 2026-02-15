"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import type { SelectEvent } from "@forge/db/schemas/knight-hacks";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";

import HackerProfileButton from "~/app/_components/admin/hackathon/hackers/hacker-profile";
import { api } from "~/trpc/react";

export function ViewAttendanceButton({
  event,
  numAttended,
}: {
  event: SelectEvent;
  numAttended: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="cursor-pointer underline">{numAttended}</div>
      </DialogTrigger>
      <DialogContent
        aria-describedby={undefined}
        className="h-3/4 w-full max-w-3xl"
      >
        <DialogHeader>
          <DialogTitle>{event.name} Attendees</DialogTitle>
        </DialogHeader>
        {isOpen && <Attendees eventId={event.id} />}
      </DialogContent>
    </Dialog>
  );
}

function Attendees({ eventId }: { eventId: string }) {
  const utils = api.useUtils();

  useEffect(() => {
    async function invalidateAttendees() {
      await utils.event.getAttendees.invalidate();
    }

    invalidateAttendees().catch((error) => {
      // eslint-disable-next-line no-console
      console.error(
        "Error invalidating members in gathering attendees: ",
        error,
      );
    });
  }, [utils.event.getAttendees]);

  const {
    data: hackerAttendees,
    isPending: hIsPending,
    isError: hIsError,
  } = api.event.getHackerAttendees.useQuery(eventId);

  if (hIsPending) {
    return (
      <div className="mx-auto">
        <Loader2 size={50} className="animate-spin" />
      </div>
    );
  }

  if (hIsError) {
    return (
      <div className="mx-auto">Something went wrong. Please try again.</div>
    );
  }

  return (
    <div className="overflow-y-auto p-4">
      <div className="space-y-4">
        {hackerAttendees.length > 0 ? (
          hackerAttendees.map((attendee) => (
            <div
              key={attendee.id}
              className="flex items-center justify-between border-b pb-2"
            >
              <span className="text-lg">
                {attendee.firstName} {attendee.lastName}
              </span>
              <HackerProfileButton hacker={attendee} />
            </div>
          ))
        ) : (
          <h1 className="text-center text-2xl font-bold">
            No one has attended this event!
          </h1>
        )}
      </div>
    </div>
  );
}
