import React from "react";
import { Star } from "lucide-react";

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

export default async function UpcomingEvents() {
  const events = await api.event.getEvents();

  const now = Date.now();
  const fiveHoursLater = now + 5 * 60 * 60 * 1000;

  const upcomingEvents = events
    .filter((event) => {
      const oneDayOffset = 24 * 60 * 60 * 1000;
      const start = new Date(event.start_datetime).getTime() + oneDayOffset;
      return (
        event.hackathonId != null && start >= now && start <= fiveHoursLater
      );
    })
    .sort(
      (a, b) =>
        new Date(a.start_datetime).getTime() -
        new Date(b.start_datetime).getTime(),
    );

  return (
    <div className="flex items-center justify-center rounded-lg border bg-gradient-to-tr from-background/50 to-primary/5 p-3 shadow-lg backdrop-blur-sm sm:p-4">
      <Card className="w-full max-w-3xl border-0 bg-transparent">
        <CardContent className="p-3 sm:p-4 lg:p-6">
          <h1 className="mb-3 text-center text-xl font-bold tracking-wider text-muted-foreground sm:mb-4 sm:text-2xl lg:text-3xl">
            UPCOMING EVENTS
          </h1>

          <div className="space-y-6">
            {upcomingEvents.map((event) => (
              <Card
                key={event.id}
                className="border bg-card shadow-lg transition-shadow duration-300 hover:shadow-xl"
              >
                <CardHeader className="pb-4">
                  <CardTitle className="mb-2 text-lg font-bold text-primary text-white sm:mb-4 sm:text-xl lg:text-2xl">
                    {event.name}
                  </CardTitle>
                  <CardDescription className="text-sm font-medium sm:text-base">
                    {formatDateTime(event.start_datetime)} @ {event.location}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-relaxed text-foreground text-white sm:text-base">
                    {event.description}
                  </p>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="rounded-lg px-3 py-1 text-sm font-medium sm:px-6 sm:py-2 sm:text-base"
                    >
                      {event.tag}
                    </Badge>
                    <div className="flex flex-row gap-1 text-sm font-medium text-primary-foreground sm:text-base">
                      <Star className="my-auto h-4 w-4 text-yellow-500" />
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
