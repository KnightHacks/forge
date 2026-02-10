"use client";

import { api } from "~/trpc/react";
import AgeBarChart from "../../../_components/AgeBarChart";
import MajorBarChart from "../../../_components/MajorBarChart";
import RaceOrEthnicityPie from "../../../_components/RaceOrEthnicityPie";
import SchoolYearPie from "../../../_components/SchoolYearPie";
import EngagementInfo from "./member-data/EngagementInfo";
import GenderPie from "./member-data/GenderPie";
import SchoolBarChart from "./member-data/SchoolBarChart";
import ShirtSizePie from "./member-data/ShirtSizePie";
import YearOfStudyPie from "./member-data/YearOfStudyPie";
import DuesOverTimeBarChart from "./member-data/DuesOverTimeBarChart";

export default function MemberDemographics() {
  const { data: members } = api.member.getMembers.useQuery();
  const { data: duesPayingStatus } = api.member.getDuesPayingMembers.useQuery();
  const { data: events } = api.event.getEvents.useQuery();
  const { data: duesPaymentDates } = api.duesPayment.getDuesPaymentDates.useQuery();
  const { data: memberAttendance } =
    api.member.getMemberAttendanceCounts.useQuery();

  return (
    <div className="my-6">
      {members && duesPayingStatus && memberAttendance && duesPaymentDates &&(
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
          <EngagementInfo
            members={members}
            events={events ?? []}
            numDuesPaying={duesPayingStatus.length}
            memberAttendance={memberAttendance}
          />
          
          <DuesOverTimeBarChart 
            duesPaymentDates={duesPaymentDates}
          />
          <AgeBarChart people={members} />
          <YearOfStudyPie members={members} />
          <GenderPie members={members} />
          <RaceOrEthnicityPie people={members} />
          <SchoolYearPie people={members} />
          <SchoolBarChart members={members} />
          <MajorBarChart people={members} />
          <ShirtSizePie members={members} />
        </div>
      )}
    </div>
  );
}
