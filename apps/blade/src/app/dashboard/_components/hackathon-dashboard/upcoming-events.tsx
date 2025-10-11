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

export default async function UpcomingEvents() {
  const events = await api.event.getEvents();

  const now = Date.now();
  const fiveHoursLater = now + 5 * 60 * 60 * 1000;

  const upcomingEvents = events
    .filter((event) => {
      const start = new Date(event.start_datetime).getTime();
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
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-12 text-center text-5xl font-bold text-primary text-white">
          Upcoming Events
        </h1>

        <div className="space-y-6">
          {upcomingEvents.map((event) => (
            <Card
              key={event.id}
              className="border-2 border-primary/20 bg-card shadow-lg transition-shadow duration-300 hover:shadow-xl"
            >
              <CardHeader className="pb-4">
                <CardTitle className="mb-2 text-4xl font-bold text-primary text-white">
                  {event.name}
                </CardTitle>
                <CardDescription className="text-lg font-medium">
                  {formatDateTime(event.start_datetime)} @ {event.location}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-base leading-relaxed text-foreground text-white">
                  {event.description}
                </p>

                <div className="flex items-center gap-3">
                  <Badge
                    variant="secondary"
                    className="rounded-lg px-6 py-2 text-base font-medium"
                  >
                    {event.tag}
                  </Badge>
                  <Badge className="rounded-lg bg-primary px-6 py-2 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                    {event.points} Points
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
