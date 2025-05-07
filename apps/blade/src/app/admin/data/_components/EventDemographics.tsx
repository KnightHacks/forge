"use client";

import { api } from "~/trpc/react";
import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";
import { SEMESTER_START_DATES } from "@forge/consts/knight-hacks";

import AttendancesBarChart from "./event-data/AttendancesBarChart";
import AttendancesMobile from "./event-data/AttendancesMobile";
import PopularityRanking from "./event-data/PopularityRanking";
import TypePie from "./event-data/TypePie";
import { WeekdayPopularityRadar } from "./event-data/WeekdayPopularityRadar";

export default function EventDemographics() {
  const { data: events } = api.event.getEvents.useQuery();
  const [activeSemester, setActiveSemester] = useState<string | null>(null);

  const semestersSet = new Set<string>();
  events?.forEach(({start_datetime}) => {
    const year = start_datetime.getFullYear();
    const springStart = new Date(`${year}-${SEMESTER_START_DATES.spring.month + 1}-${SEMESTER_START_DATES.spring.day}`);
    const summerStart = new Date(`${year}-${SEMESTER_START_DATES.summer.month + 1}-${SEMESTER_START_DATES.summer.day}`);
    const fallStart = new Date(`${year}-${SEMESTER_START_DATES.fall.month + 1}-${SEMESTER_START_DATES.fall.day}`);

    // keep track of semesters that exist in events table of db
    if (start_datetime >= springStart && start_datetime < summerStart)
      semestersSet.add(`Spring ${year}`);
    else if (start_datetime >= summerStart && start_datetime < fallStart)
      semestersSet.add(`Summer ${year}`);
    else if (start_datetime >= fallStart && start_datetime < new Date(`${year+1}-1-1`))
      semestersSet.add(`Fall ${year}`);
    else
      semestersSet.add("No semester");
  });

  const semestersArr = ["All", ...semestersSet]; // for select options

  return (
    <div className="my-6">
      {events && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
          <Select 
            value={activeSemester ?? undefined}
            onValueChange={(semester) => {
              const selectedSemester =
                semestersArr.find((s) => s === semester) ?? null;
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
              {semestersArr.map((semester) => (
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
