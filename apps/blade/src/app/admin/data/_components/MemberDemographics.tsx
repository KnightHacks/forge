"use client";

import { api } from "~/trpc/react";
import RaceOrEthnicityPie from "./RaceOrEthnicityPie";
import DuesPercent from "./DuesPercent";
import GenderPie from "./GenderPie";

export default function MemberDemographics() {
    const { data: members } = api.member.getMembers.useQuery();
    const { data: duesPayingStatus } = api.member.getDuesPayingMembers.useQuery();

    return (
        <div className="my-8">
            {members && duesPayingStatus && 
            <div className="grid grid-cols-2 gap-4">
                <DuesPercent numMembers={members.length} numDuesPaying={duesPayingStatus.length} /> 
                <GenderPie members={members} />
                <RaceOrEthnicityPie members={members} />
            </div>}
        </div>
    );
}