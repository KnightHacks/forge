"use client";

import { api } from "~/trpc/react";
import { useEffect, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";
import AttendancesBarChart from "./event-data/AttendancesBarChart";
import AttendancesMobile from "./event-data/AttendancesMobile";
import PopularityRanking from "./event-data/PopularityRanking";
import TypePie from "./event-data/TypePie";
import { WeekdayPopularityRadar } from "./event-data/WeekdayPopularityRadar";

export default function EventDemographics() {
  const { data: events } = api.event.getEvents.useQuery();
  const [activeSemester, setActiveSemester] = useState<string | null>(null);

  const placeholderSemesters = ["spring", "summer", "fall"];

  return (
    <div className="my-6">
      {events && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
          <Select 
            value={activeSemester ?? undefined}
            onValueChange={(semester) => {
              const selectedSemester =
                placeholderSemesters.find((s) => s === semester) ?? null;
              setActiveSemester(selectedSemester);
            }}
          >
            <SelectTrigger
              className="md:w-1/2 lg:w-1/2"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Select semester" />
            </SelectTrigger>
            <SelectContent>
              {placeholderSemesters.map((semester) => (
                <SelectItem key={semester} value={semester}>
                  {semester} <span className="me-2" />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <PopularityRanking events={events} />

          {/* visible on large/medium screens */}
          <AttendancesBarChart className="hidden lg:block" events={events} />
          {/* visible on mobile (small) screens only */}
          <AttendancesMobile className="lg:hidden" events={events} />

          <TypePie events={events} />
          <WeekdayPopularityRadar events={events} />
        </div>
      )}
    </div>
  );
}
