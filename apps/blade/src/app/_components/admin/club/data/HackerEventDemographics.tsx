"use client";

import { useEffect, useState } from "react";

import type { InsertHackathon } from "@forge/db/schemas/knight-hacks";
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

export default function HackerEventDemographics() {
  const { data: hackathons } = api.hackathon.getHackathons.useQuery();
  const [activeHackathon, setActiveHackathon] =
    useState<InsertHackathon | null>(null);

  useEffect(() => {
    if (!activeHackathon && hackathons?.length) {
      setActiveHackathon(hackathons[0] ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: events } = api.event.getEvents.useQuery();

  const filteredEvents = events
    ?.filter((event) => {
      if (activeHackathon) return event.hackathonId == activeHackathon.id;
      return event.hackathonId != null;
    })
    .sort((a, b) => (a.tag > b.tag ? 1 : a.tag < b.tag ? -1 : 0)); // ensure same order of tags

  return (
    <div className="my-6">
      {events && (
        <div className="grid gap-4">
          <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row-reverse lg:flex-row-reverse">
            <Select
              value={activeHackathon?.name ?? "all"}
              onValueChange={(name) => {
                const selectedHackathon =
                  hackathons?.find((h) => h.name === name) ?? null;
                setActiveHackathon(selectedHackathon);
              }}
            >
              <SelectTrigger
                className="md:w-1/2 lg:w-1/2"
                aria-label="Select a value"
              >
                <SelectValue placeholder="Select a hackathon..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="all" value="all">
                  All Hackathons
                </SelectItem>
                {hackathons?.map((hackathon) => (
                  <SelectItem key={hackathon.id} value={hackathon.name}>
                    {hackathon.name}
                    <span className="me-2" />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <h1 className="text-3xl font-extrabold tracking-tight">
              {activeHackathon?.name ?? "All Hackathons"}
            </h1>
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
