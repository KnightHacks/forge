import React from "react";

import { Badge } from "@forge/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";

import { formatDateTime } from "~/lib/utils";
import { api } from "~/trpc/server";
import { Star } from "lucide-react";

export default async function UpcomingEvents() {
  const events = await api.event.getEvents();

  const now = Date.now();
  const fiveHoursLater = now + 5 * 60 * 60 * 1000;

  const upcomingEvents = events
    .filter((event) => {
      const start = new Date(event.start_datetime).getTime(); // adjust key if needed
      return event.hackathonId != null && start >= now;
    })
    .sort(
      (a, b) =>
        new Date(a.start_datetime).getTime() -
        new Date(b.start_datetime).getTime(),
    );

  return (
    <div className="flex items-center justify-center rounded-lg border bg-gradient-to-tr from-background/50 to-primary/5 shadow-lg backdrop-blur-sm p-3 sm:p-4">
      <Card className="w-full max-w-3xl border-0 bg-transparent">
        <CardContent className="p-3 sm:p-4 lg:p-6">
          <h1 className="mb-3 tracking-wider text-muted-foreground text-center font-bold text-xl sm:mb-4 sm:text-2xl lg:text-3xl">
            UPCOMING EVENTS
          </h1>

          <div className="space-y-6">
            {upcomingEvents.map((event) => (
              <Card
                key={event.id}
                className="border bg-card shadow-lg transition-shadow duration-300 hover:shadow-xl"
              >
                <CardHeader className="pb-4">
                  <CardTitle className="mb-2 text-lg sm:mb-4 sm:text-xl lg:text-2xl font-bold text-primary text-white">
                    {event.name}
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base font-medium">
                    {formatDateTime(event.start_datetime)} @ {event.location}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm sm:text-base leading-relaxed text-foreground text-white">
                    {event.description}
                  </p>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="rounded-lg px-3 py-1 sm:px-6 sm:py-2 text-sm sm:text-base font-medium"
                    >
                      {event.tag}
                    </Badge>
                    <div className="flex flex-row gap-1 text-sm sm:text-base font-medium text-primary-foreground">
                      <Star className="h-4 w-4 my-auto text-yellow-500" />
                      <div className="my-auto">{event.points} Points</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
