"use client";

import { api } from "~/trpc/react";
import RaceOrEthnicityPie from "./RaceOrEthnicityPie";
import EngagementInfo from "./EngagementInfo";
import GenderPie from "./GenderPie";
import AgeBarChart from "./AgeBarChart";
import SchoolYearPie from "./SchoolYearPie";

export default function MemberDemographics() {
    const { data: members } = api.member.getMembers.useQuery();
    const { data: duesPayingStatus } = api.member.getDuesPayingMembers.useQuery();
    const { data: events } = api.member.getEvents.useQuery();

    return (
        <div className="my-8">
            {members && duesPayingStatus && 
            <div className="grid grid-cols-2 gap-4">
                <EngagementInfo members={members} events={events ?? []} numDuesPaying={duesPayingStatus.length} /> 
                <GenderPie members={members} />
                <RaceOrEthnicityPie members={members} />
                <AgeBarChart members={members} />
                <SchoolYearPie members={members} />
            </div>}
        </div>
    );
}