"use client";

import { api } from "~/trpc/react";
import PopularityRanking from "./event-data/PopularityRanking"
import AttendancesPie from "./event-data/AttendancesPie";
import TypePie from "./event-data/TypePie";

export default function EventDemographics() {
    const { data: events } = api.event.getEvents.useQuery();

    return (
        <div className="my-8">
            {events && 
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
                <PopularityRanking events={events} />
                <TypePie events={events} />
                {/* <AttendancesPie /> */}
                <p>weekday popularity ranking</p>
                <p>time popularity ranking</p>
            </div>}
        </div>
    );
}