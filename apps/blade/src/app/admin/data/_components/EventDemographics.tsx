"use client";

import { api } from "~/trpc/react";
import PopularityRanking from "./event-data/PopularityRanking"
import TypePie from "./event-data/TypePie";
import AttendancesBarChart from "./event-data/AttendancesBarChart";
import { WeekdayPopularityRadar } from "./event-data/WeekdayPopularityRadar";

export default function EventDemographics() {
    const { data: events } = api.event.getEvents.useQuery();

    return (
        <div className="my-6">
            {events && 
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
                <PopularityRanking events={events} />
                <AttendancesBarChart events={events} />
                <TypePie events={events} />
                <WeekdayPopularityRadar events={events} />
            </div>}
        </div>
    );
}