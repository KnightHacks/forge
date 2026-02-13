"use client";

import { useState } from "react";

import type { Semester } from "@forge/consts/knight-hacks";
import {
  ALL_DATES_RANGE_UNIX,
  SEMESTER_START_DATES,
} from "@forge/consts/knight-hacks";
import { Checkbox } from "@forge/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";

import { api } from "~/trpc/react";
import AttendancesBarChart from "./event-data/AttendancesBarChart";
import AttendancesMobile from "./event-data/AttendancesMobile";
import PopularityRanking from "./event-data/PopularityRanking";
import TypePie from "./event-data/TypePie";
import { WeekdayPopularityRadar } from "./event-data/WeekdayPopularityRadar";

export default function EventDemographics() {
  const { data: events } = api.event.getEvents.useQuery();
  const semestersArr: Semester[] = [
    {
      name: "All Semesters",
      startDate: new Date(ALL_DATES_RANGE_UNIX.start),
      endDate: new Date(ALL_DATES_RANGE_UNIX.end),
    },
  ]; // for select options

  const defaultSemester = semestersArr[0] ?? null;
  const [activeSemester, setActiveSemester] = useState<Semester | null>(
    defaultSemester,
  );
  const [includeHackathons, setIncludeHackathons] = useState(false);

  const semestersSet = new Set<string>();
  events?.forEach(({ start_datetime }) => {
    const year = start_datetime.getFullYear();
    const springStart = new Date(
      `${year}-${SEMESTER_START_DATES.spring.month + 1}-${SEMESTER_START_DATES.spring.day}`,
    );
    const summerStart = new Date(
      `${year}-${SEMESTER_START_DATES.summer.month + 1}-${SEMESTER_START_DATES.summer.day}`,
    );
    const fallStart = new Date(
      `${year}-${SEMESTER_START_DATES.fall.month + 1}-${SEMESTER_START_DATES.fall.day}`,
    );

    // keep track of semesters that exist in events table of db
    if (start_datetime >= springStart && start_datetime < summerStart) {
      const semesterName = `Spring ${year}`;
      if (!semestersSet.has(semesterName)) {
        semestersSet.add(semesterName);
        const springEnd = new Date(
          `${year}-${SEMESTER_START_DATES.summer.month + 1}-${SEMESTER_START_DATES.summer.day}`,
        );
        semestersArr.push({
          name: semesterName,
          startDate: springStart,
          endDate: springEnd,
        });
      }
    } else if (start_datetime >= summerStart && start_datetime < fallStart) {
      const semesterName = `Summer ${year}`;
      if (!semestersSet.has(semesterName)) {
        semestersSet.add(semesterName);
        const summerEnd = new Date(
          `${year}-${SEMESTER_START_DATES.fall.month + 1}-${SEMESTER_START_DATES.fall.day}`,
        );
        semestersArr.push({
          name: semesterName,
          startDate: summerStart,
          endDate: summerEnd,
        });
      }
    } else if (
      start_datetime >= fallStart &&
      start_datetime < new Date(`${year + 1}-1-1`)
    ) {
      const semesterName = `Fall ${year}`;
      if (!semestersSet.has(semesterName)) {
        semestersSet.add(semesterName);
        const fallEnd = new Date(
          `${year + 1}-${SEMESTER_START_DATES.spring.month + 1}-${SEMESTER_START_DATES.spring.day}`,
        );
        semestersArr.push({
          name: semesterName,
          startDate: fallStart,
          endDate: fallEnd,
        });
      }
    }
  });

  const filteredEvents = events
    ?.filter((event) => {
      if (activeSemester)
        return includeHackathons
          ? event.start_datetime > activeSemester.startDate &&
              event.start_datetime < activeSemester.endDate
          : event.start_datetime > activeSemester.startDate &&
              event.start_datetime < activeSemester.endDate &&
              !event.hackathonId;
      return includeHackathons ? true : !event.hackathonId;
    })
    .sort((a, b) => (a.tag > b.tag ? 1 : a.tag < b.tag ? -1 : 0)); // ensure same order of tags

  return (
    <div className="my-6">
      {events && (
        <div className="grid gap-4">
          <div className="flex flex-row gap-4">
            <Select
              value={activeSemester?.name ?? undefined}
              onValueChange={(semester) => {
                const selectedSemester =
                  semestersArr.find(({ name }) => name === semester) ?? null;
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
                  <SelectItem key={semester.name} value={semester.name}>
                    {semester.name} <span className="me-2" />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-row gap-2">
              <Checkbox
                className="my-auto"
                checked={includeHackathons}
                onCheckedChange={(e) => {
                  setIncludeHackathons(e.valueOf() ? true : false);
                }}
              />
              <span className="my-auto text-lg">Include Hackathon Events</span>
            </div>
          </div>
          {filteredEvents && filteredEvents.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
              <PopularityRanking events={filteredEvents} />

              {/* visible on large/medium screens */}
              <AttendancesBarChart
                className="hidden lg:block"
                events={filteredEvents}
              />
              {/* visible on mobile (small) screens only */}
              <AttendancesMobile
                className="lg:hidden"
                events={filteredEvents}
              />

              <TypePie events={filteredEvents} />
              <WeekdayPopularityRadar events={filteredEvents} />
            </div>
          ) : (
            <p className="mt-20 text-center text-slate-300">
              No events found for the selected semester!
            </p>
          )}
        </div>
      )}
    </div>
  );
}
