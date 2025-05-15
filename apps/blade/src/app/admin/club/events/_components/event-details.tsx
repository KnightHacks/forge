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
            <div className="flex flex-row justify-normal gap-4 pb-2 text-left">
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
            <div className="flex w-full max-w-md gap-x-10 gap-y-2 pl-1">
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium text-gray-600">Start</span>
                <span className="mt-1 font-medium">
                  {formatDateTime(event.start_datetime)}
                </span>
              </div>

              <div className="flex flex-col items-start">
                <span className="text-sm font-medium text-gray-600">End</span>
                <span className="mt-1 font-medium">
                  {formatDateTime(event.end_datetime)}
                </span>
              </div>
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
