"use client";

import { api } from "~/trpc/react";
import AgeBarChart from "./member-data/AgeBarChart";
import EngagementInfo from "./member-data/EngagementInfo";
import GenderPie from "./member-data/GenderPie";
import RaceOrEthnicityPie from "./member-data/RaceOrEthnicityPie";
import SchoolYearPie from "./member-data/SchoolYearPie";

export default function MemberDemographics() {
  const { data: members } = api.member.getMembers.useQuery();
  const { data: duesPayingStatus } = api.member.getDuesPayingMembers.useQuery();
  const { data: events } = api.event.getEvents.useQuery();

  return (
    <div className="my-8">
      {members && duesPayingStatus && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
          <EngagementInfo
            members={members}
            events={events ?? []}
            numDuesPaying={duesPayingStatus.length}
          />
          <GenderPie members={members} />
          <RaceOrEthnicityPie people={members} />
          <AgeBarChart people={members} />
          <SchoolYearPie people={members} />
        </div>
      )}
    </div>
  );
}
