import { CalendarDays, MapPin, Star, Users } from "lucide-react";

import type { InsertMember } from "@forge/db/schemas/knight-hacks";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";

import type { api } from "~/trpc/server";
import { DASHBOARD_ICON_SIZE } from "~/consts";
import { formatDateTime, getTagColor } from "~/lib/utils";
import { EventFeedbackForm } from "./event-feedback";

export function EventShowcase({
  events,
  member,
}: {
  events: Awaited<ReturnType<(typeof api.member)["getEvents"]>>;
  member: InsertMember;
}) {
  const mostRecent = events[0];

  if (!mostRecent) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Recent Event Attended
          </CardTitle>
          <CalendarDays
            color="hsl(263.4 70% 50.4%)"
            size={DASHBOARD_ICON_SIZE}
          />
        </CardHeader>
        <CardHeader>
          <CardTitle>No events found</CardTitle>
          <CardDescription></CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Recent Event Attended
        </CardTitle>
        <CalendarDays color="hsl(263.4 70% 50.4%)" size={DASHBOARD_ICON_SIZE} />
      </CardHeader>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{mostRecent.name}</CardTitle>
            <CardDescription className="mt-1">
              {mostRecent.description}
            </CardDescription>
          </div>
          <Badge className={`${getTagColor(mostRecent.tag)} my-auto`}>
              {mostRecent.tag}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-gray-500" />
            <div className="flex flex-col">
              <span>Start: {formatDateTime(mostRecent.start_datetime)}</span>
              <span>End: {formatDateTime(mostRecent.end_datetime)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-gray-500" />
            <span>{mostRecent.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-500" />
            <span>
              {mostRecent.numAttended}{" "}
              {mostRecent.numAttended === 1 ? "Attendee" : "Attendees"}
            </span>
          </div>
          <div className="flex flex-row justify-between">
            {mostRecent.points && (
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <span>{mostRecent.points} Points</span>
              </div>
            )}
            <div>
              <EventFeedbackForm event={mostRecent} member={member} />
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">View All</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-y-auto max-w-2xl">
            <DialogHeader>
              <DialogTitle>Past Events Attended</DialogTitle>
            </DialogHeader>
            <div className="max-h-96 space-y-4 overflow-y-auto">
              {events.map((event) => (
                <Card key={event.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{event.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {event.description}
                        </CardDescription>
                      </div>
                      <Badge className={`${getTagColor(event.tag)} my-auto`}>
                          {event.tag}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-gray-500" />
                        <div className="flex flex-col">
                          <span>
                            Start: {formatDateTime(event.start_datetime)}
                          </span>
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
                      <div className="flex flex-row justify-between">
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
                        <div>
                          <EventFeedbackForm event={event} member={member} />
                        </div>
                      </div>

                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <DialogDescription></DialogDescription>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
