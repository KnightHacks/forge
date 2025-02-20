"use client";

import { useState } from "react";
import { CalendarDays, MapPin, Star, Users } from "lucide-react";
import ReactMarkdown from "react-markdown";

import type { ReturnEvent } from "@forge/db/schemas/knight-hacks";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";

import { formatDateTime, getTagColor } from "~/lib/utils";

export function EventDetailsButton({ event }: { event: ReturnEvent }) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <CalendarDays className="h-5 w-5" />
        </Button>
      </DialogTrigger>

      <DialogContent
        aria-describedby={undefined}
        className="max-h-[80vh] overflow-y-auto"
      >
        <DialogHeader className="flex items-start justify-between">
          <div>
            <div className="flex flex-row justify-normal text-left gap-4 pb-2">
              <DialogTitle>{event.name}</DialogTitle>
              <Badge className={`${getTagColor(event.tag)} whitespace-nowrap`}>
                {event.tag}
              </Badge>
            </div>
            <DialogDescription className="text-left">
              <ReactMarkdown>{event.description}</ReactMarkdown>
            </DialogDescription>
          </div>
        </DialogHeader>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-gray-500" />
            <div className="flex flex-col">
              <span>Start: {formatDateTime(event.start_datetime)}</span>
              <span>End: {formatDateTime(event.end_datetime)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" />
            <span>
              {event.numAttended}{" "}
              {event.numAttended === 1 ? "Attendee" : "Attendees"}
            </span>
          </div>
          {event.points ? (
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span>{event.points} Points</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span>0 Points</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
