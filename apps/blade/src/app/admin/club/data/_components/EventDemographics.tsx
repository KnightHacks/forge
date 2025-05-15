"use client";

import { api } from "~/trpc/react";
import AttendancesBarChart from "./event-data/AttendancesBarChart";
import AttendancesMobile from "./event-data/AttendancesMobile";
import PopularityRanking from "./event-data/PopularityRanking";
import TypePie from "./event-data/TypePie";
import { WeekdayPopularityRadar } from "./event-data/WeekdayPopularityRadar";

export default function EventDemographics() {
  const { data: events } = api.event.getEvents.useQuery();

  return (
    <div className="my-6">
      {events && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
          <PopularityRanking events={events} />

          {/* visible on large/medium screens */}
          <AttendancesBarChart
            className="hidden md:block lg:block"
            events={events}
          />
          {/* visible on mobile (small) screens only */}
          <AttendancesMobile className="md:hidden lg:hidden" events={events} />

          <TypePie events={events} />
          <WeekdayPopularityRadar events={events} />
        </div>
      )}
    </div>
  );
}
