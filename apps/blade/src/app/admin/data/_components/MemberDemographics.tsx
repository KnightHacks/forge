"use client";

import { api } from "~/trpc/react";
import DuesPercentCard from "./DuesPercentCard";

export default function MemberDemographics() {
    const { data: members } = api.member.getMembers.useQuery();
    const { data: duesPayingStatus } = api.member.getDuesPayingMembers.useQuery();

    return (
        <div>
            {members && duesPayingStatus ? 
            <DuesPercentCard numMembers={members.length} numDuesPaying={duesPayingStatus.length} /> : 
            <p>error</p>}
        </div>
    );
}