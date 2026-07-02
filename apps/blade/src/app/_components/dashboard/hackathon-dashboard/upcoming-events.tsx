import { Star } from "lucide-react";

import { cn } from "@forge/ui";
import { Badge } from "@forge/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";
import { time } from "@forge/utils";

import type { DashboardFrameTheme } from "~/app/_components/dashboard/dashboard-frame-theme";
import { api } from "~/trpc/server";

export async function BaseHackathonUpcomingEvents({
  dashboardFrameTheme,
  hackathonId,
}: {
  dashboardFrameTheme?: DashboardFrameTheme;
  hackathonId: string;
}) {
  const events = await api.event.getEvents();

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const fiveHoursLater = now + 5 * 60 * 60 * 1000;

  const upcomingEvents = events
    .filter((event) => {
      const oneDayOffset = 24 * 60 * 60 * 1000;
      const start = new Date(event.start_datetime).getTime() + oneDayOffset;
      return (
        event.hackathonId === hackathonId &&
        start >= now &&
        start <= fiveHoursLater
      );
    })
    .sort(
      (a, b) =>
        new Date(a.start_datetime).getTime() -
        new Date(b.start_datetime).getTime(),
    );

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg border bg-gradient-to-tr from-background/50 to-primary/5 p-3 shadow-lg backdrop-blur-sm sm:p-4",
        dashboardFrameTheme?.sectionShellClassName,
      )}
    >
      <Card
        className={cn(
          "w-full max-w-3xl border-0 bg-transparent",
          dashboardFrameTheme?.sectionCardClassName,
        )}
      >
        <CardContent className="p-3 sm:p-4 lg:p-6">
          <h1
            className={cn(
              "mb-3 text-center text-xl font-bold tracking-wider text-muted-foreground sm:mb-4 sm:text-2xl lg:text-3xl",
              dashboardFrameTheme?.sectionHeadingClassName,
            )}
          >
            UPCOMING EVENTS
          </h1>

          <div className="space-y-6">
            {upcomingEvents.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-card/60 p-6 text-center text-sm font-medium text-muted-foreground sm:text-base">
                No events coming up in the next few hours.
              </div>
            ) : (
              upcomingEvents.map((event) => (
                <Card
                  key={event.id}
                  className={cn(
                    "border bg-card shadow-lg transition-shadow duration-300 hover:shadow-xl",
                    dashboardFrameTheme?.eventCardClassName,
                  )}
                >
                  <CardHeader className="pb-4">
                    <CardTitle
                      className={cn(
                        "mb-2 text-lg font-bold text-primary text-white sm:mb-4 sm:text-xl lg:text-2xl",
                        dashboardFrameTheme?.eventTitleClassName,
                      )}
                    >
                      {event.name}
                    </CardTitle>
                    <CardDescription
                      className={cn(
                        "text-sm font-medium sm:text-base",
                        dashboardFrameTheme?.eventMetaClassName,
                      )}
                    >
                      {time.formatDateTime(event.start_datetime)} @{" "}
                      {event.location}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p
                      className={cn(
                        "text-sm leading-relaxed text-foreground text-white sm:text-base",
                        dashboardFrameTheme?.eventDescriptionClassName,
                      )}
                    >
                      {event.description}
                    </p>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "rounded-lg px-3 py-1 text-sm font-medium sm:px-6 sm:py-2 sm:text-base",
                          dashboardFrameTheme?.eventBadgeClassName,
                        )}
                      >
                        {event.tag}
                      </Badge>
                      <div
                        className={cn(
                          "flex flex-row gap-1 text-sm font-medium text-primary-foreground sm:text-base",
                          dashboardFrameTheme?.eventPointsClassName,
                        )}
                      >
                        <Star className="my-auto h-4 w-4 text-yellow-500" />
                        <div className="my-auto">{event.points} Points</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
